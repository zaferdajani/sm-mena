/**
 * Browser-side video compression with ffmpeg.wasm, ported from OneClickConvert
 * (src/utils/videoConvert.ts). Generic (compressVideo) with a preset for
 * interface backgrounds (compressBackgroundVideo).
 *
 * - The engine (~31 MB of WebAssembly) is served from our own origin
 *   (`/engines/ffmpeg/…`, copied by scripts/vendor-engines.mjs at build time)
 *   and only downloaded when someone actually picks a video.
 * - Single-threaded core only: the multi-threaded one needs SharedArrayBuffer,
 *   i.e. COOP/COEP headers this site does not send.
 * - Load strategies are tried in order, ESM before UMD, blob URLs before
 *   direct URLs, as OCC does; ffmpeg's own worker is loaded from the vendored
 *   copy (`classWorkerURL`) so no bundler rewrites its `import(coreURL)`, with
 *   the bundled worker kept as a fallback.
 *
 * Quality rule (docs/26-media-compression.md): the smallest file that looks
 * the same. H.264 CRF is searched from high to low quality on a short sample
 * and the HIGHEST CRF whose SSIM against the scaled source (ffmpeg's `ssim`
 * filter, "All:") stays at or above VIDEO_SSIM_FLOOR wins; the whole clip is
 * then encoded once at that CRF. If that is still over the request cap, the
 * resolution steps down (never more blur at the same size); only after the
 * smallest width does a byte-budget search take over, and the result says so.
 *
 * Output: H.264 (yuv420p) MP4 with the index at the front (+faststart), at
 * most 1280 px wide, metadata stripped; backgrounds also lose their audio
 * (they play muted) and are capped at 30 s.
 */
import type { FFmpeg, ProgressEvent as FFProgressEvent } from "@ffmpeg/ffmpeg";
import { searchLargestUnderTarget, searchSmallestPassing } from "./size-search";
import { parseFfmpegSsim, VIDEO_SSIM_FLOOR } from "./ssim";

/** The most a video upload may weigh: a serverless request body cannot be much bigger. */
export const VIDEO_MAX_BYTES = 4 * 1024 * 1024;
/** Budget for the last-resort byte search, leaving room for the rest of the form. */
const VIDEO_BUDGET_FALLBACK = Math.floor(3.5 * 1024 * 1024);
export const MAX_VIDEO_SECONDS = 30;
/** Widths tried in order when the same-quality result is still over the cap. */
const WIDTHS = [1280, 960, 720, 540];
/** CRF from high to low quality; searched as 51 − CRF so a higher param means more fidelity. */
const CRF_LADDER = [20, 26, 32, 38];
const CRF_ABOVE = [16, 12];
/** Seconds of the source the CRF search looks at. */
const SAMPLE_SECONDS = 4;
/** Sources above this are refused before the engine even loads (they would exhaust the wasm heap). */
const MAX_SOURCE_BYTES = 1024 * 1024 * 1024;

export type VideoCompressErrorCode = "engine" | "unsupported" | "tooLarge" | "cancelled";

export class VideoCompressError extends Error {
  constructor(
    public code: VideoCompressErrorCode,
    public detail?: string,
  ) {
    super(code);
    this.name = "VideoCompressError";
  }
}

export type VideoProgress =
  | { stage: "engine"; received: number; total?: number }
  | { stage: "encoding"; pass: number; ratio: number };

export type VideoCompressOptions = {
  signal?: AbortSignal;
  onProgress?: (p: VideoProgress) => void;
};

export type VideoOptions = VideoCompressOptions & {
  /** Display cap; never upscaled. */
  maxWidth?: number;
  dropAudio?: boolean;
  maxSeconds?: number;
  ssimFloor?: number;
  /** Hard cap (the request limit). */
  maxBytes?: number;
};

export type CompressedVideo = {
  file: File;
  width: number;
  crf: number;
  /** SSIM of the sample at the chosen CRF (null when a byte budget had to decide). */
  ssim: number | null;
  /** Set when the display width had to drop to fit `maxBytes`. */
  reducedTo?: number;
  /** True when even the smallest width needed the byte-budget search (quality below the floor). */
  budget?: boolean;
};

type Strategy = { worker: "vendored" | "bundled"; flavour: "esm" | "umd"; viaBlob: boolean };

/**
 * Order matters (see OCC). ffmpeg spawns a module worker, where only the ESM
 * core loads; UMD is the one that works if a bundler ever emits a classic
 * worker. Blob URLs first (they report download progress), direct URLs last
 * because they avoid holding the whole wasm in memory twice.
 */
const STRATEGIES: Strategy[] = [
  { worker: "vendored", flavour: "esm", viaBlob: true },
  { worker: "bundled", flavour: "esm", viaBlob: true },
  { worker: "bundled", flavour: "umd", viaBlob: true },
  { worker: "vendored", flavour: "esm", viaBlob: false },
  { worker: "bundled", flavour: "umd", viaBlob: false },
];

let enginePromise: Promise<FFmpeg> | null = null;
let engine: FFmpeg | null = null;
let progressSink: ((e: FFProgressEvent) => void) | null = null;
/** Rolling ffmpeg log; the ssim filter reports its score there. */
let logLines: string[] = [];

const abs = (path: string) => new URL(path, window.location.origin).href;

async function buildEngine(onProgress?: VideoCompressOptions["onProgress"]): Promise<FFmpeg> {
  let mod: typeof import("@ffmpeg/ffmpeg");
  let util: typeof import("@ffmpeg/util");
  try {
    [mod, util] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
  } catch (error) {
    throw new VideoCompressError("engine", error instanceof Error ? error.message : undefined);
  }

  // Downloaded once and shared by every attempt (the esm and umd builds use the same wasm).
  const blobs = new Map<string, Promise<string>>();
  const sizes = new Map<string, { received: number; total: number }>();
  const report = () => {
    let received = 0;
    let total = 0;
    for (const s of sizes.values()) {
      received += s.received;
      total += s.total;
    }
    onProgress?.({ stage: "engine", received, total: total || undefined });
  };
  const viaBlob = (url: string, type: string) => {
    if (!blobs.has(url)) {
      blobs.set(
        url,
        util.toBlobURL(url, type, true, (e) => {
          sizes.set(url, { received: e.received, total: Math.max(0, e.total) });
          report();
        }),
      );
    }
    return blobs.get(url)!;
  };

  const tried: string[] = [];
  for (const s of STRATEGIES) {
    const ffmpeg = new mod.FFmpeg();
    try {
      let coreURL = abs(`/engines/ffmpeg/${s.flavour}/ffmpeg-core.js`);
      let wasmURL = abs("/engines/ffmpeg/ffmpeg-core.wasm");
      if (s.viaBlob) {
        report();
        [coreURL, wasmURL] = await Promise.all([viaBlob(coreURL, "text/javascript"), viaBlob(wasmURL, "application/wasm")]);
      }
      const classWorkerURL = s.worker === "vendored" ? abs("/engines/ffmpeg/worker/worker.js") : undefined;
      await ffmpeg.load({ coreURL, wasmURL, ...(classWorkerURL ? { classWorkerURL } : {}) });
      ffmpeg.on("progress", (e) => progressSink?.(e));
      ffmpeg.on("log", ({ message }) => {
        logLines.push(message);
        if (logLines.length > 400) logLines.splice(0, logLines.length - 400);
      });
      return ffmpeg;
    } catch (error) {
      try {
        ffmpeg.terminate();
      } catch {
        /* never started */
      }
      tried.push(`${s.worker}/${s.flavour}${s.viaBlob ? "+blob" : ""}: ${error instanceof Error ? error.message : String(error)}`.slice(0, 160));
    }
  }
  throw new VideoCompressError("engine", tried.join(" | "));
}

/** Loads ffmpeg once per page and reuses it. */
export async function loadVideoEngine(onProgress?: VideoCompressOptions["onProgress"]): Promise<FFmpeg> {
  if (engine) return engine;
  enginePromise ??= buildEngine(onProgress).then(
    (ffmpeg) => (engine = ffmpeg),
    (error) => {
      enginePromise = null;
      throw error;
    },
  );
  return enginePromise;
}

/** Hard-stops any running compression. The next run reloads the engine (from the browser cache). */
export function cancelVideoCompression() {
  const running = engine;
  engine = null;
  enginePromise = null;
  progressSink = null;
  try {
    running?.terminate();
  } catch {
    /* nothing to stop */
  }
}

function extensionOf(file: File) {
  const fromName = /\.([a-z0-9]{2,4})$/i.exec(file.name)?.[1];
  if (fromName) return fromName.toLowerCase();
  if (file.type.includes("webm")) return "webm";
  if (file.type.includes("quicktime")) return "mov";
  return "mp4";
}

const scaleFilter = (width: number) => `scale='trunc(min(${width},iw)/2)*2':-2`;

/** Interface backgrounds: muted, at most 30 s and 1280 px wide, under the 4 MB request cap. */
export function compressBackgroundVideo(file: File, opts: VideoCompressOptions = {}) {
  return compressVideo(file, { ...opts, dropAudio: true, maxSeconds: MAX_VIDEO_SECONDS, maxWidth: 1280, maxBytes: VIDEO_MAX_BYTES });
}

export async function compressVideo(file: File, opts: VideoOptions = {}): Promise<CompressedVideo> {
  const { signal, onProgress, maxWidth = 1280, dropAudio = false, maxSeconds, ssimFloor = VIDEO_SSIM_FLOOR, maxBytes = VIDEO_MAX_BYTES } = opts;
  if (file.size > MAX_SOURCE_BYTES) throw new VideoCompressError("tooLarge");
  const cancelled = () => new VideoCompressError("cancelled");
  if (signal?.aborted) throw cancelled();
  const onAbort = () => cancelVideoCompression();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const ffmpeg = await loadVideoEngine(onProgress);
    if (signal?.aborted) throw cancelled();
    const { FFFSType } = await import("@ffmpeg/ffmpeg");

    // WORKERFS lets ffmpeg read the File from the browser's blob store instead
    // of copying every byte into the wasm heap; unnamed files fall back to a copy.
    const dir = `/in-${Date.now()}`;
    let input = `${dir}/${file.name}`;
    let mounted = false;
    try {
      if (!file.name) throw new Error("WORKERFS needs a file name");
      await ffmpeg.createDir(dir);
      await ffmpeg.mount(FFFSType.WORKERFS, { files: [file] }, dir);
      mounted = true;
    } catch {
      input = `source.${extensionOf(file)}`;
      await ffmpeg.writeFile(input, new Uint8Array(await file.arrayBuffer()));
    }

    let pass = 0;
    const run = async (args: string[]) => {
      const current = ++pass;
      progressSink = (e) => onProgress?.({ stage: "encoding", pass: current, ratio: Math.min(1, Math.max(0, e.progress)) });
      onProgress?.({ stage: "encoding", pass: current, ratio: 0 });
      logLines = [];
      const code = await ffmpeg.exec(args);
      if (signal?.aborted) throw cancelled();
      if (code !== 0) throw new VideoCompressError("unsupported", `ffmpeg exited ${code}: ${logLines.slice(-3).join(" ")}`.slice(0, 300));
      return logLines.join("\n");
    };
    const output = async (name: string, keep = false) => {
      // readFile hands over a copy; anything passed back to the worker (writeFile) is transferred and detached.
      const data = await ffmpeg.readFile(name);
      if (!keep) await ffmpeg.deleteFile(name).catch(() => undefined);
      if (!(data instanceof Uint8Array) || data.byteLength === 0) throw new VideoCompressError("unsupported", "empty output");
      return data;
    };
    const audio = dropAudio ? ["-an"] : ["-map", "0:a:0?", "-c:a", "aac", "-b:a", "128k"];
    const encode = async (width: number, crf: number, seconds: number | undefined, name: string, keep = false) => {
      const log = await run([
        "-i", input,
        ...(seconds ? ["-t", String(seconds)] : []),
        "-map", "0:v:0", ...audio, "-sn", "-dn",
        "-map_metadata", "-1",
        "-vf", scaleFilter(width),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", String(crf), "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        name,
      ]);
      return { data: await output(name, keep), log };
    };
    /** SSIM of an encoded sample against the same seconds of the source, scaled the same way. */
    const measure = async (name: string, width: number, seconds: number) => {
      const log = await run([
        "-i", name,
        "-t", String(seconds), "-i", input,
        "-lavfi", `[1:v]${scaleFilter(width)},format=yuv420p[ref];[0:v]format=yuv420p[out];[out][ref]ssim`,
        "-f", "null", "-",
      ]);
      await ffmpeg.deleteFile(name).catch(() => undefined);
      return parseFfmpegSsim(log) ?? 0;
    };

    const sampleSeconds = Math.min(SAMPLE_SECONDS, maxSeconds ?? SAMPLE_SECONDS);
    let duration: number | null = null;
    let sourceWidth: number | null = null;
    let result: CompressedVideo | null = null;
    let smallest: { data: Uint8Array; width: number; crf: number } | null = null;

    let step = 0;
    for (const width of WIDTHS.filter((w) => w <= maxWidth)) {
      // The source is narrower than this step already: it would produce the same file again.
      if (step > 0 && sourceWidth !== null && width >= sourceWidth) continue;
      step++;
      const found = await searchSmallestPassing({
        render: async (quality) => {
          const crf = 51 - quality;
          const sample = await encode(width, crf, sampleSeconds, "sample.mp4", true);
          duration ??= parseDuration(sample.log);
          sourceWidth ??= parseVideoWidth(sample.log);
          return { crf, data: sample.data, ssim: await measure("sample.mp4", width, sampleSeconds) };
        },
        sizeOf: (c) => c.data.byteLength,
        passes: (c) => c.ssim >= ssimFloor,
        ladder: CRF_LADDER.map((crf) => 51 - crf),
        above: CRF_ABOVE.map((crf) => 51 - crf),
        round: Math.round,
        epsilon: 1,
        maxRefine: 2,
        signal,
      });
      const crf = found.candidate.crf;
      // A clip no longer than the sample is already fully encoded.
      const whole = duration !== null && duration <= sampleSeconds ? found.candidate.data : (await encode(width, crf, maxSeconds, "out.mp4")).data;
      if (!smallest || whole.byteLength < smallest.data.byteLength) smallest = { data: whole, width, crf };
      if (whole.byteLength <= maxBytes) {
        const shown = Math.min(width, sourceWidth ?? width);
        result = { file: toFile(file, whole), width: shown, crf, ssim: found.candidate.ssim, ...(step > 1 ? { reducedTo: shown } : {}) };
        break;
      }
    }

    if (!result && smallest) {
      // Even the smallest width is over the cap at the same quality: the byte budget decides.
      const width = smallest.width;
      const found = await searchLargestUnderTarget({
        render: async (quality) => (await encode(width, 51 - quality, maxSeconds, "out.mp4")).data,
        sizeOf: (b) => b.byteLength,
        targetBytes: Math.min(maxBytes, VIDEO_BUDGET_FALLBACK),
        ladder: [51 - (smallest.crf + 4), 51 - (smallest.crf + 8), 51 - 40],
        round: Math.round,
        epsilon: 1,
        maxRefine: 2,
        goodEnough: 0.8,
        signal,
      });
      if (found.hitTarget) result = { file: toFile(file, found.candidate), width, crf: 51 - found.param, ssim: null, reducedTo: width, budget: true };
    }

    if (mounted) await ffmpeg.unmount(dir).catch(() => undefined);
    else await ffmpeg.deleteFile(input).catch(() => undefined);
    if (!result) throw new VideoCompressError("tooLarge");
    return result;
  } catch (error) {
    if (signal?.aborted) throw cancelled();
    if (error instanceof VideoCompressError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw cancelled();
    // ffmpeg rejects exec/readFile when it cannot parse the input.
    throw new VideoCompressError("unsupported", error instanceof Error ? error.message : String(error));
  } finally {
    progressSink = null;
    signal?.removeEventListener("abort", onAbort);
  }
}

function toFile(source: File, data: Uint8Array) {
  const name = (source.name.replace(/\.[^.]+$/, "") || "video") + ".mp4";
  return new File([data.slice().buffer as ArrayBuffer], name, { type: "video/mp4", lastModified: Date.now() });
}

/** Width of the first video stream in ffmpeg's input banner ("Video: h264 …, 1920x1080"); null when absent. */
export function parseVideoWidth(log: string): number | null {
  const m = /Stream #0:\d+[^\n]*Video:[^\n]*?\b(\d{2,5})x(\d{2,5})\b/.exec(log);
  return m ? Number(m[1]) : null;
}

/** "Duration: 00:00:05.04" from ffmpeg's input banner, in seconds; null when unknown (e.g. MediaRecorder WebM). */
export function parseDuration(log: string): number | null {
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(log);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}
