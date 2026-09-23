import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Storage adapter. "local" writes to UPLOADS_DIR (default .data/uploads) and
// serves files through app/media/[...key]/route.ts. "supabase" uses a public
// Supabase Storage bucket for production (Vercel's filesystem is read-only).

export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(keys: string[]): Promise<void>;
  url(key: string): string;
}

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_-]*\.(webp|png|jpg)$/;

export function isSafeKey(key: string): boolean {
  return KEY_PATTERN.test(key) && !key.includes("..") && !key.includes("//");
}

function localStorage(): Storage {
  const root = process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads");
  const resolve = (key: string) => {
    if (!isSafeKey(key)) throw new Error(`Unsafe storage key: ${key}`);
    return path.join(/* turbopackIgnore: true */ root, key);
  };
  return {
    async put(key, body) {
      const file = resolve(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
    },
    async get(key) {
      try {
        return await readFile(resolve(key));
      } catch {
        return null;
      }
    },
    async remove(keys) {
      await Promise.all(keys.map((key) => rm(resolve(key), { force: true })));
    },
    url: (key) => `/media/${key}`,
  };
}

function supabaseStorage(): Storage {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? "media";
  if (!url || !serviceKey) {
    throw new Error("STORAGE_PROVIDER=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url, serviceKey, { auth: { persistSession: false } }),
  );
  return {
    async put(key, body, contentType) {
      const client = await clientPromise;
      const { error } = await client.storage
        .from(bucket)
        .upload(key, body, { contentType, upsert: true, cacheControl: "31536000" });
      if (error) throw error;
    },
    async get(key) {
      const client = await clientPromise;
      const { data } = await client.storage.from(bucket).download(key);
      return data ? Buffer.from(await data.arrayBuffer()) : null;
    },
    async remove(keys) {
      const client = await clientPromise;
      if (keys.length) await client.storage.from(bucket).remove(keys);
    },
    url: (key) => `${url}/storage/v1/object/public/${bucket}/${key}`,
  };
}

let instance: Storage | undefined;

export function storage(): Storage {
  instance ??= process.env.STORAGE_PROVIDER === "supabase" ? supabaseStorage() : localStorage();
  return instance;
}

export function mediaUrl(key: string | null | undefined): string | null {
  return key ? storage().url(key) : null;
}
