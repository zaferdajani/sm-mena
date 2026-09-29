/** Guidance only: never grants Founder eligibility or changes publishing rules. */
export type CreatorSetupFacts = { bio: string; services: readonly string[]; postCount: number };
export function creatorSetupProgress(facts: CreatorSetupFacts) {
  const profile = facts.bio.trim().length > 0 && facts.services.length > 0;
  const work = Number.isFinite(facts.postCount) && facts.postCount > 0;
  return { profile, work, completed: Number(profile) + Number(work), total: 2 } as const;
}
export const PORTFOLIO_EXAMPLES = ['social', 'identity', 'photo', 'website'] as const;
export type PortfolioExample = (typeof PORTFOLIO_EXAMPLES)[number];
/** Never replace a caption written by the user; examples are never submitted. */
export function captionStructure(current: string, template: string): string | null {
  return current.trim() ? null : template.slice(0, 2200);
}
