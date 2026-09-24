/** What an admin may do right now, given the two-factor policy. Pure for testing. */
export function adminAccess(user: { role: string; mfaEnabled: boolean } | null, mfaRequired: boolean): "login" | "forbidden" | "enroll" | "ok" {
  if (!user) return "login";
  if (user.role !== "admin") return "forbidden";
  if (mfaRequired && !user.mfaEnabled) return "enroll";
  return "ok";
}
