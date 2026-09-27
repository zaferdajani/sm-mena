# 42 · Referral agents: field marketing that brings providers

In the early stage Sawwiq hires marketing agents to bring agencies, freelancers and creators onto the platform. Each agent has a personal link and code. Every provider who signs up with it is credited to them, and they earn for each one that becomes **active**.

## How it works
- **Admin → Agents** (`agents.manage`: owner and admin).
  - Add an agent with a name, sign-in email, phone, personal code (e.g. `ahmad`) and pay per active account (default 5 JOD).
  - The agent account (role `agent`) gets a one-time password, shown once to hand over. Agents can also sign in with an emailed code (docs/41) and change their password on their page.
- **Their link.** `sawwiq.org/j/<code>` saves the code in a cookie for 60 days (`sw_ref`) and opens sign-up with it filled in. Providers can also type the code in the optional "Agent code" field. `?ref=<code>` works too.
- **Credit** (`attributeReferral`):
  - happens once, at sign-up;
  - requires an active agent;
  - never counts the agent's own email or a demo agency.
- **Active** (`isActiveReferral`, `lib/referrals.ts`): a real, active page with a bio, services and at least one work post, not voided. Empty sign-ups never pay.
- **Pay:**
  - The pay rate for each active account.
  - **Milestone bonuses**, default: 10 → 10 JOD, 25 → 30, 50 → 75, 100 → 200. Edit them in Admin → Agents.
  - Owed = earned − payouts recorded.
- **Paid outside Sawwiq.** No money moves on the platform (docs/32). Admin records each payout (amount and note), exports the list as CSV, and can pause an agent, change their rate, or void a referral with a reason (and restore it). All of these are audited.
- **The agent's page** (`/agent`):
  - their link, code and QR code (to show when visiting agencies);
  - sign-ups, active accounts, earned, paid and owed;
  - progress to the next bonus;
  - each referred provider with what it still needs (bio, services, first work), so the agent can help them finish;
  - a leaderboard of agents by first name;
  - their sign-in details.

## Data
`referral_agents`, `referral_payouts`, `agencies.referred_by_agent_id` and `agencies.referral_void_reason` (migration 0019, idempotent), plus the `app_settings` key `referral_tiers`.
