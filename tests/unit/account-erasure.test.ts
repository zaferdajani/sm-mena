import "./setup-db";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { deactivateAgency } from "@/lib/data/deactivation";
import { createPost } from "@/lib/data/posts";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies, postImages, posts } from "@/lib/db/schema";
import { storage } from "@/lib/storage";

afterAll(() => closeDb());

const png = () => sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 30, g: 90, b: 160 } } }).png().toBuffer();

async function agencyWithFiles(handle: string) {
  const u = await createUser(`${handle}@t.jo`, "password-1234");
  const a = await createAgency(u.id, { handle, name: handle, city: "amman", services: ["photography"] });
  const avatarKey = `avatars/${handle.replace(/\W/g, "-")}.webp`;
  await storage().put(avatarKey, Buffer.from("avatar"), "image/webp");
  const db = await getDb();
  await db.update(agencies).set({ avatarKey }).where(eq(agencies.id, a.id));
  const post = await createPost(a.id, { caption: "Shoot", services: ["photography"], platforms: ["instagram"] }, [await png()]);
  const [img] = await db.select().from(postImages).where(eq(postImages.postId, post.id));
  return { agencyId: a.id, userId: u.id, avatarKey, img };
}

describe("account closure erases the holder's files", () => {
  it("removes avatar, post images and thumbnails when the holder closes their account", async () => {
    const { agencyId, userId, avatarKey, img } = await agencyWithFiles("erase.self");
    expect(await storage().get(img.key)).not.toBeNull();
    expect(await deactivateAgency(agencyId, "self", userId)).toMatchObject({ ok: true });
    expect(await storage().get(avatarKey)).toBeNull();
    expect(await storage().get(img.key)).toBeNull();
    expect(await storage().get(img.thumbKey)).toBeNull();
    const db = await getDb();
    expect(await db.select().from(posts).where(eq(posts.agencyId, agencyId))).toHaveLength(0);
    const [a] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
    expect(a.avatarKey).toBeNull();
  });

  it("keeps the files when an admin closes the account (support can reopen it)", async () => {
    const { agencyId, userId, avatarKey } = await agencyWithFiles("erase.admin");
    await deactivateAgency(agencyId, "admin", userId);
    expect(await storage().get(avatarKey)).not.toBeNull();
  });
});
