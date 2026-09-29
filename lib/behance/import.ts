import "server-only";
import { createPostFromProcessed, type PostInput } from "@/lib/data/posts";
import { ImageError, MAX_IMAGES_PER_POST, newAvatarKey, processAvatar, processImage, type ProcessedImage } from "@/lib/images";
import { storage } from "@/lib/storage";
import { updateAgency } from "@/lib/data/agencies";
import { assertBehanceUrl, defaultFetcher, type Fetcher } from "./fetch";
import { BEHANCE_LIMITS } from "./types";

// The only writes of the Behance import (docs/47): a reviewed draft becomes a
// post through the same image pipeline as an upload, and an accepted profile
// picture goes through the avatar pipeline. Images are pulled from Behance's
// CDN by the server, never by the visitor's browser.

export class BehanceImportError extends Error {
  constructor(public code: "noImages" | "tooMany" | "badImage" | "unreachable") {
    super(code);
  }
}

async function download(url: string, fetcher: Fetcher): Promise<Buffer> {
  assertBehanceUrl(url);
  let res;
  try {
    res = await fetcher(url, { accept: "image/*", maxBytes: BEHANCE_LIMITS.imageBytes });
  } catch {
    throw new BehanceImportError("unreachable");
  }
  if (!res || res.status >= 400 || !res.body.length) throw new BehanceImportError("badImage");
  return res.body;
}

export type BehanceImportInput = {
  /** The Behance project link, kept on the post as its credit. */
  projectUrl: string;
  /** Behance CDN image links the provider kept, in order. */
  images: string[];
  /** When the project was published on Behance; the post keeps that date so the portfolio reads in order. */
  publishedAt?: Date | null;
} & Omit<PostInput, "sourceUrl">;

/** Downloads the kept images, processes them like an upload, and publishes the post with its Behance credit. */
export async function importBehanceProject(agencyId: string, input: BehanceImportInput, fetcher = defaultFetcher()) {
  const urls = [...new Set(input.images)];
  if (!urls.length) throw new BehanceImportError("noImages");
  if (urls.length > MAX_IMAGES_PER_POST) throw new BehanceImportError("tooMany");
  const sourceUrl = assertBehanceUrl(input.projectUrl).toString();
  const processed: ProcessedImage[] = [];
  for (const url of urls) {
    try {
      processed.push(await processImage(await download(url, fetcher)));
    } catch (e) {
      if (e instanceof BehanceImportError) throw e;
      throw new BehanceImportError(e instanceof ImageError ? "badImage" : "unreachable");
    }
  }
  const { projectUrl: _p, images: _i, publishedAt, ...fields } = input;
  void _p;
  void _i;
  const at = publishedAt && publishedAt.getTime() < Date.now() ? publishedAt : undefined;
  return createPostFromProcessed(agencyId, { ...fields, sourceUrl }, processed, at);
}

/** The Behance profile picture becomes the page picture (the old one is removed). */
export async function importBehanceAvatar(agency: { id: string; avatarKey: string | null }, url: string, fetcher = defaultFetcher()) {
  const key = newAvatarKey(agency.id);
  await storage().put(key, await processAvatar(await download(url, fetcher)), "image/webp");
  await updateAgency(agency.id, { avatarKey: key });
  if (agency.avatarKey) await storage().remove([agency.avatarKey]).catch(() => undefined);
  return key;
}
