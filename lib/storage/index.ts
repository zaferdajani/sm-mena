import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Storage adapter. "local" writes to UPLOADS_DIR (default .data/uploads) and
// serves files through app/media/[...key]/route.ts. "supabase" uses a public
// Supabase Storage bucket for production (Vercel's filesystem is read-only).
// Private prefixes (work-order files) live in a second, private bucket and are
// only ever read through an authenticated route.

export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(keys: string[]): Promise<void>;
  url(key: string): string;
}

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_-]*\.(webp|png|jpg|mp4|webm)$/;

export function isSafeKey(key: string): boolean {
  return KEY_PATTERN.test(key) && !key.includes("..") && !key.includes("//");
}

/** Keys under these prefixes are never public: no public URL, a private bucket, served only by an authenticated route. */
const PRIVATE_PREFIXES = ["collab/"];
export const isPrivateKey = (key: string) => PRIVATE_PREFIXES.some((p) => key.startsWith(p));

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
    url: (key) => {
      if (isPrivateKey(key)) throw new Error(`Private storage key has no public URL: ${key}`);
      return `/media/${key}`;
    },
  };
}

function supabaseStorage(): Storage {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "media";
  const privateBucket = `${bucket}-private`;
  const bucketFor = (key: string) => (isPrivateKey(key) ? privateBucket : bucket);
  if (!url || !serviceKey) {
    throw new Error("STORAGE_PROVIDER=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  // The bucket is created on first use (public: post photos, avatars and
  // backgrounds are public anyway; contracts and signatures never go here).
  // A failed connect is retried on the next call instead of being cached.
  let ready: Promise<import("@supabase/supabase-js").SupabaseClient> | undefined;
  const connect = async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, serviceKey, { auth: { persistSession: false } });
    for (const [name, isPublic] of [[bucket, true], [privateBucket, false]] as const) {
      const { error: missing } = await client.storage.getBucket(name);
      if (missing) {
        const { error } = await client.storage.createBucket(name, { public: isPublic });
        if (error && !/already exists/i.test(error.message)) throw error;
      }
    }
    return client;
  };
  const getClient = () =>
    (ready ??= connect().catch((error) => {
      ready = undefined;
      throw error;
    }));
  return {
    async put(key, body, contentType) {
      const client = await getClient();
      const { error } = await client.storage
        .from(bucketFor(key))
        .upload(key, body, { contentType, upsert: true, cacheControl: isPrivateKey(key) ? "0" : "31536000" });
      if (error) throw error;
    },
    async get(key) {
      const client = await getClient();
      const { data } = await client.storage.from(bucketFor(key)).download(key);
      return data ? Buffer.from(await data.arrayBuffer()) : null;
    },
    async remove(keys) {
      const client = await getClient();
      const pub = keys.filter((k) => !isPrivateKey(k));
      const priv = keys.filter(isPrivateKey);
      if (pub.length) await client.storage.from(bucket).remove(pub);
      if (priv.length) await client.storage.from(privateBucket).remove(priv);
    },
    url: (key) => {
      if (isPrivateKey(key)) throw new Error(`Private storage key has no public URL: ${key}`);
      return `${url}/storage/v1/object/public/${bucket}/${key}`;
    },
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
