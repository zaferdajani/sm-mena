"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/guards";
import { setAcceptingProjects } from "@/lib/data/availability";

// "Open to new projects" (docs/65): the owner's own switch, from the setup's success screen and the Studio home.

export async function setAvailabilityAction(accepting: boolean): Promise<{ accepting: boolean } | { error: "generic" }> {
  const { user, agency } = await requireAgency();
  if (!(await setAcceptingProjects(user.id, agency.id, accepting === true))) return { error: "generic" };
  revalidatePath("/[locale]", "layout");
  return { accepting: accepting === true };
}

/** The same switch as a form (the Studio home is a server component); "confirm" keeps the value and refreshes the date. */
export async function availabilityFormAction(formData: FormData) {
  const { user, agency } = await requireAgency();
  const intent = String(formData.get("intent") ?? "");
  const accepting = intent === "confirm" ? agency.acceptingProjects : intent === "open";
  await setAcceptingProjects(user.id, agency.id, accepting);
  revalidatePath("/[locale]", "layout");
}
