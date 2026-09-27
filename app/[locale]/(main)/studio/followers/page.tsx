import { Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAgency } from "@/lib/auth/guards";
import { listFollowers } from "@/lib/data/interactions";
import { maskEmail, timeAgo } from "@/lib/format";

/**
 * Who follows this agency (docs/41): signed-in client accounts, newest first.
 * Addresses are masked; a follower is a lead signal, not a contact list.
 */
export default async function FollowersPage({ params }: PageProps<"/[locale]/studio/followers">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Studio.followersPage");
  const followers = await listFollowers(agency.id);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">{t("title", { count: followers.length })}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      {followers.length === 0 ? (
        <div className="rounded-2xl border py-10 text-center text-sm text-muted-foreground" data-testid="followers-empty">
          <Users className="mx-auto mb-2 size-6" aria-hidden />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border" data-testid="followers">
          {followers.map((f) => (
            <li key={f.userId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-bold uppercase text-accent-foreground" aria-hidden>
                  {f.email.slice(0, 1)}
                </span>
                <span className="font-medium" dir="ltr">{maskEmail(f.email)}</span>
              </span>
              <span className="text-xs text-muted-foreground" suppressHydrationWarning>{t("followedAt", { when: timeAgo(f.followedAt.toISOString(), locale) })}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{t("privacy")}</p>
    </div>
  );
}
