import type { ReactNode } from "react";
import styles from "@/components/profile/profile-layout.module.css";

/** Presentation only: agency/freelancer profiles and their account collections.
 * The global feed, Studio, matching, payments and referral-agent area are untouched.
 */
export default function ProviderProfileLayout({ children }: { children: ReactNode }) {
  return <div className={styles.frame} data-testid="provider-profile-layout">{children}</div>;
}
