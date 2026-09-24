/**
 * The drawn signature arrives from the browser as a PNG data URL (see
 * components/contracts/signature-pad.tsx). Only a small, genuine PNG is
 * accepted; anything else is treated as "no drawn signature".
 */

const PREFIX = "data:image/png;base64,";
/** Largest decoded PNG accepted, in bytes. */
export const MAX_SIGNATURE_BYTES = 200 * 1024;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function parseSignatureDataUrl(value: unknown): Uint8Array | null {
  if (typeof value !== "string" || !value.startsWith(PREFIX)) return null;
  const base64 = value.slice(PREFIX.length);
  // Cheap size check before decoding: 4 base64 chars carry 3 bytes.
  if (base64.length === 0 || base64.length > Math.ceil((MAX_SIGNATURE_BYTES * 4) / 3) + 4) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;
  const bytes = new Uint8Array(Buffer.from(base64, "base64"));
  if (bytes.length > MAX_SIGNATURE_BYTES || bytes.length < 24) return null;
  if (!PNG_MAGIC.every((b, i) => bytes[i] === b)) return null;
  return bytes;
}

/** Pixel size from the PNG's IHDR chunk, or null when it is not readable. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24 || !PNG_MAGIC.every((b, i) => bytes[i] === b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width > 0 && height > 0 ? { width, height } : null;
}
