// Voice notes and screen recordings on problem reports (docs/61). Pure: the
// server checks what a file really is from its first bytes, never from its name
// or the type the browser claims. Limits keep one request under Vercel's
// ~4.5 MB body cap (lib/media/image-compress.ts REQUEST_LIMIT).

export const AUDIO_MAX_BYTES = 3 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 4 * 1024 * 1024;
/** In-app voice notes stop by themselves after this long. */
export const VOICE_MAX_SECONDS = 120;

export type SniffedMedia = { kind: "audio" | "video"; ext: "webm" | "mp4" | "mp3" | "ogg" | "wav"; type: string };

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

/** Identifies WebM, MP4/M4A, MP3, Ogg and WAV from their headers; null for anything else. */
export function sniffMedia(bytes: Uint8Array, claimed: "audio" | "video"): SniffedMedia | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return { kind: claimed, ext: "webm", type: `${claimed}/webm` };
  if (ascii(bytes, 4, 8) === "ftyp") return { kind: claimed, ext: "mp4", type: `${claimed}/mp4` };
  if (claimed === "video") return null;
  if (ascii(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return { kind: "audio", ext: "mp3", type: "audio/mpeg" };
  if (ascii(bytes, 0, 4) === "OggS") return { kind: "audio", ext: "ogg", type: "audio/ogg" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WAVE") return { kind: "audio", ext: "wav", type: "audio/wav" };
  return null;
}

/** Content type for a stored report file, from its extension (the key was written by us after sniffing). */
export function supportMediaType(key: string): string | null {
  const ext = key.split(".").pop();
  if (key.startsWith("support/") && ext === "webp") return "image/webp";
  const types: Record<string, string> = { webm: "audio/webm", mp4: "video/mp4", m4a: "audio/mp4", mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav" };
  return ext ? (types[ext] ?? null) : null;
}
