import { daysLeft, roundsState } from "@/lib/contracts/rules";
import type { ContractView } from "@/lib/data/contracts";
import { formatDate } from "@/lib/format";
import type { MilestoneInfo } from "./milestone-list";

/** Deadline, days left and revision rounds per milestone, worked out once on the server. */
export function milestoneInfo(v: ContractView, locale: string, now = new Date()): Record<string, MilestoneInfo> {
  const v4 = v.contract.termsVersion >= 4;
  return Object.fromEntries(
    v.milestones.map((m) => {
      const r = roundsState(v.contract, m);
      return [
        m.id,
        {
          ...(m.status === "submitted" && m.reviewDueAt ? { reviewBy: formatDate(m.reviewDueAt, locale), daysLeft: daysLeft(m.reviewDueAt, now) } : {}),
          ...(v4 ? { rounds: { left: r.left, total: r.included + r.extra } } : {}),
          roundAsked: Boolean(m.extraRoundAskedAt),
          autoApproved: m.approvedBy === "deadline",
        } satisfies MilestoneInfo,
      ];
    }),
  );
}
