// Reading text off page images on the device with tesseract.js (docs/36):
// free, private, and enough for portfolio pages that are pictures only. The
// engine files are served from our own origin (scripts/vendor-engines.mjs);
// the language files fall back to tesseract.js's data host if ours are missing.

const ENGINE = "/engines/tesseract";
const TESSDATA = "https://tessdata.projectnaptha.com/4.0.0_fast";

type Worker = { recognize: (image: HTMLCanvasElement | Blob) => Promise<{ data: { text: string; confidence: number } }>; terminate: () => Promise<unknown> };

let workerPromise: Promise<Worker> | null = null;

async function langPath() {
  try {
    const res = await fetch(`${ENGINE}/eng.traineddata.gz`, { method: "HEAD" });
    if (res.ok) return ENGINE;
  } catch {
    // fall through
  }
  return TESSDATA;
}

/** One shared OCR worker (English and Arabic), created on first use. */
export async function ocrWorker(): Promise<Worker> {
  workerPromise ??= (async () => {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker(["eng", "ara"], 1, { workerPath: `${ENGINE}/worker.min.js`, corePath: ENGINE, langPath: await langPath(), logger: () => {} });
    return worker as unknown as Worker;
  })();
  return workerPromise;
}

/** Text read off an image, tidied. Empty when the engine finds nothing it trusts. */
export async function readText(image: HTMLCanvasElement | Blob): Promise<string> {
  const worker = await ocrWorker();
  const { data } = await worker.recognize(image);
  if (data.confidence < 25) return "";
  return data.text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 2 && /[\p{L}\p{N}]/u.test(l))
    .join("\n");
}

export async function stopOcr() {
  const w = await workerPromise?.catch(() => null);
  workerPromise = null;
  await w?.terminate();
}
