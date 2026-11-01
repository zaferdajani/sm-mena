/**
 * App Store / Play review (Guideline 2.1 / 2.3.1): unfinished "Coming soon"
 * screens and placeholders must not ship in production builds. Local dev and
 * tests keep them so pilots can preview; NEXT_PUBLIC_SHOW_COMING_SOON=true
 * opts a staging build back in. Safe to call from client components.
 */
export function showComingSoon(): boolean {
  if (process.env.NEXT_PUBLIC_SHOW_COMING_SOON === "true") return true;
  return process.env.NODE_ENV !== "production";
}
