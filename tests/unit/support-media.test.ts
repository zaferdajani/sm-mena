import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sniffMedia, supportMediaType } from "@/lib/support-media";

describe("report media", () => {
  it("recognises real files by their bytes", () => {
    expect(sniffMedia(readFileSync("tests/fixtures/voice-note-ar.webm"), "audio")).toEqual({ kind: "audio", ext: "webm", type: "audio/webm" });
    expect(sniffMedia(readFileSync("tests/fixtures/screen-recording.mp4"), "video")).toEqual({ kind: "video", ext: "mp4", type: "video/mp4" });
    expect(sniffMedia(Buffer.from("ID3\u0004\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000"), "audio")?.ext).toBe("mp3");
    expect(sniffMedia(Buffer.from("RIFF\u0000\u0000\u0000\u0000WAVEfmt "), "audio")?.ext).toBe("wav");
  });

  it("refuses anything else, and audio-only formats as video", () => {
    expect(sniffMedia(Buffer.from("<html><script>alert(1)</script>"), "audio")).toBeNull();
    expect(sniffMedia(Buffer.from("OggS\u0000\u0002\u0000\u0000\u0000\u0000\u0000\u0000"), "video")).toBeNull();
  });

  it("serves stored report files with a fixed type", () => {
    expect(supportMediaType("support/0f4a.webm")).toBe("audio/webm");
    expect(supportMediaType("support/0f4a.mp4")).toBe("video/mp4");
    expect(supportMediaType("support/0f4a.exe")).toBeNull();
  });
});
