// The page link (handle) after sign-up (docs/65 stage 8). Pure.
// Free to change while nothing is published: the link has not been shared yet. Once a project is
// published it may change once more (people change their mind about a name once, not weekly), and
// the old link keeps working through a permanent redirect. Fiverr and Upwork lock the slug for good and
// collect complaints; LinkedIn allows changes and redirects.

export type HandleFacts = { postCount: number; handleChangedAt: Date | null };

export type HandlePolicy = { canChange: boolean; reason: "free" | "once_left" | "locked" };

export function handlePolicy(f: HandleFacts): HandlePolicy {
  if (f.postCount === 0) return { canChange: true, reason: "free" };
  if (!f.handleChangedAt) return { canChange: true, reason: "once_left" };
  return { canChange: false, reason: "locked" };
}

/** Whether this change consumes the one post-publish change. */
export function consumesChange(f: HandleFacts): boolean {
  return f.postCount > 0;
}
