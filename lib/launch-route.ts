import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { canBrowseDirectory } from "@/lib/launch-access";

// Kept apart from lib/launch-access.ts so the data layer (and its unit tests)
// never load next-intl's navigation module; pages import this one.

/** Route convenience only. Data readers and server actions enforce the same boundary independently. */
export async function requireDirectory() {
  if (!(await canBrowseDirectory())) redirect({ href: "/soon", locale: await getLocale() });
}
