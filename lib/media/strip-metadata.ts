/**
 * Lossless metadata stripping for JPEG, PNG and WebP: the pixels (the
 * compressed image data) are copied byte for byte, only metadata containers
 * are dropped. This is how an upload that is already smaller than any
 * re-encode can be stored as-is without leaking EXIF (GPS, camera serials),
 * XMP, IPTC or comments. Colour information (ICC profiles, gamma, sRGB
 * chunks) is kept because removing it would change how the picture looks.
 *
 * Pure (Uint8Array in, Uint8Array out); returns null when the file is not
 * well-formed enough to be sure nothing else is lost.
 */

export type StrippableFormat = "jpeg" | "png" | "webp";

export function stripMetadata(body: Uint8Array, format: StrippableFormat): Uint8Array | null {
  try {
    if (format === "jpeg") return stripJpeg(body);
    if (format === "png") return stripPng(body);
    return stripWebp(body);
  } catch {
    return null;
  }
}

const ascii = (b: Uint8Array, start: number, length: number) => String.fromCharCode(...b.subarray(start, start + length));

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/**
 * JPEG: keeps JFIF (APP0), ICC profiles (APP2 "ICC_PROFILE"), Adobe colour
 * transform (APP14) and every non-APP segment; drops EXIF/XMP (APP1), other
 * APP2 uses such as MPF, APP3–13, APP15 and comments. Anything after the end
 * of the image (e.g. appended secondary pictures) is dropped too.
 */
function stripJpeg(b: Uint8Array): Uint8Array | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) return null;
    let marker = b[i + 1];
    while (marker === 0xff) marker = b[++i + 1]; // fill bytes
    if (marker === 0xd9) {
      parts.push(b.subarray(i, i + 2));
      return concat(parts);
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const length = (b[i + 2] << 8) | b[i + 3];
    if (length < 2 || i + 2 + length > b.length) return null;
    const end = i + 2 + length;
    const payload = i + 4;
    const isApp = marker >= 0xe0 && marker <= 0xef;
    const keep =
      !isApp && marker !== 0xfe
        ? true
        : marker === 0xe0 || marker === 0xee || (marker === 0xe2 && ascii(b, payload, 12) === "ICC_PROFILE\0");
    if (keep) parts.push(b.subarray(i, end));
    i = end;
    if (marker === 0xda) {
      // Entropy-coded scan data runs until a marker that is not a stuffed 0x00 or a restart.
      let j = i;
      while (j < b.length - 1 && !(b[j] === 0xff && b[j + 1] !== 0x00 && !(b[j + 1] >= 0xd0 && b[j + 1] <= 0xd7))) j++;
      parts.push(b.subarray(i, j));
      i = j;
    }
  }
  return null; // no end-of-image marker
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Ancillary chunks that change how the image renders or animates; every other ancillary chunk is metadata. */
const PNG_KEEP = new Set(["tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "sBIT", "bKGD", "pHYs", "acTL", "fcTL", "fdAT"]);

function stripPng(b: Uint8Array): Uint8Array | null {
  if (!PNG_SIGNATURE.every((v, k) => b[k] === v)) return null;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const length = view.getUint32(i);
    const type = ascii(b, i + 4, 4);
    const end = i + 12 + length;
    if (end > b.length) return null;
    const critical = type.charCodeAt(0) >= 65 && type.charCodeAt(0) <= 90;
    if (critical || PNG_KEEP.has(type)) parts.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") return concat(parts);
  }
  return null;
}

/** WebP: drops the EXIF and XMP chunks of an extended (VP8X) file and clears their flags. */
function stripWebp(b: Uint8Array): Uint8Array | null {
  if (ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return null;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const riffEnd = Math.min(b.length, 8 + view.getUint32(4, true));
  const parts: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= riffEnd) {
    const type = ascii(b, i, 4);
    const size = view.getUint32(i + 4, true);
    const end = i + 8 + size + (size & 1);
    if (i + 8 + size > riffEnd) return null;
    if (type === "VP8X") {
      const chunk = b.slice(i, Math.min(end, riffEnd));
      chunk[8] &= ~(0x08 | 0x04); // EXIF and XMP flags
      parts.push(chunk);
    } else if (type !== "EXIF" && type !== "XMP ") {
      parts.push(b.subarray(i, Math.min(end, riffEnd)));
    }
    i = end;
  }
  const body = concat(parts);
  const header = new Uint8Array(12);
  header.set(b.subarray(0, 12));
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  return concat([header, body]);
}
