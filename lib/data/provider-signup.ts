import { createAgency, isHandleTaken } from "@/lib/data/agencies";
import { attributeReferral } from "@/lib/data/referrals";
import { assignFoundingSeats } from "@/lib/data/teaser";
import { createUser, deleteUser, getUserByEmail } from "@/lib/data/users";
import { internationalPhone } from "@/lib/dial-codes";
import { normalizeRoleSelection } from "@/lib/services/role-input";
import { resolveServices } from "@/lib/services/tags";
import { validateHandle } from "@/lib/text";
import { recordFunnel } from "@/lib/data/funnel";
import type { JoinInput } from "@/lib/validation/auth";

// Creating a provider account: the one set of rules the web sign-up (app/[locale]/(auth)/actions.ts) and the
// app's POST /api/v1/auth/signup both use, so a phone and a browser can never make different accounts.
// Input is already validated (joinSchema / apiSignupSchema: consent and age confirmed); sessions, cookies and
// redirects stay with each caller.

export type ProviderSignupError = "handleInvalid" | "handleReserved" | "handleTaken" | "emailTaken" | "invalidPhone";

export type ProviderSignupInput = Pick<JoinInput, "name" | "handle" | "city" | "whatsapp" | "email" | "password"> & {
  whatsappCountry?: string | null;
  kind?: "agency" | "freelancer";
  services?: string[];
  newServices?: string[];
  teamRoles?: string[];
  ref?: string | null;
  /** Setup reminders by email (docs/65 stage 4): only when the box was ticked. */
  reminders?: boolean;
};

export async function registerProvider(input: ProviderSignupInput): Promise<{ ok: true; userId: string; agencyId: string } | { error: ProviderSignupError }> {
  const handleCheck = validateHandle(input.handle);
  if (handleCheck === "invalid") return { error: "handleInvalid" };
  if (handleCheck === "reserved") return { error: "handleReserved" };
  if (await isHandleTaken(input.handle)) return { error: "handleTaken" };
  if (await getUserByEmail(input.email)) return { error: "emailTaken" };
  // The number as typed plus the country picked beside it (lib/dial-codes.ts).
  const whatsapp = internationalPhone(input.whatsappCountry ?? "", input.whatsapp);
  if (!/^\+?\d{8,15}$/.test(whatsapp)) return { error: "invalidPhone" };

  const user = await createUser(input.email, input.password, "agency", { ageConfirmed: true }).catch(() => null);
  if (!user) return { error: "emailTaken" };
  let agencyId: string;
  try {
    const picked = await resolveServices(null, input.services ?? [], input.newServices ?? []);
    const kind = input.kind === "freelancer" ? "freelancer" : "agency";
    const teamRoles = normalizeRoleSelection(input.teamRoles ?? []);
    const created = await createAgency(user.id, {
      handle: input.handle,
      name: input.name,
      city: input.city,
      whatsapp,
      phone: whatsapp,
      services: picked.services,
      pendingServices: picked.pending,
      kind,
      teamRoles,
      // Nothing is "looked for" until the provider says so: a guessed list advertised them for roles they never chose.
      seeksRoles: [],
    }, { setupRemindersOptIn: input.reminders === true });
    agencyId = created.id;
    await recordFunnel("account_created", created.id);
    // The marketing agent whose link or code brought them (docs/42).
    await attributeReferral(created.id, input.ref ?? null, input.email).catch(() => false);
  } catch {
    // e.g. the handle was taken a moment ago; do not leave an orphan account
    await deleteUser(user.id);
    return { error: "handleTaken" };
  }
  // Their founding seat number (docs/39), shown in the studio.
  await assignFoundingSeats();
  return { ok: true, userId: user.id, agencyId };
}
