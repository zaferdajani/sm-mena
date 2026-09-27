# Research and competitive hypotheses

Verified by reading public official pages on 2026-09-27. Product documentation and vendor claims are not an independent usability benchmark, a logged-in product test, or proof of country-specific availability. Feature absence from these pages does not establish that a competitor lacks a capability. Do not copy assets, text, code or confidential product behavior.

| Source | Observation from the source | Sawwiq decision |
|---|---|---|
| Contra, https://contra.com/agencies | Agency talent networks, internal lists/notes, freelancer onboarding and contractor workflows are presented together. | Make a reusable private roster central to repeat collaboration, not an isolated directory. |
| YunoJuno, https://www.yunojuno.com/direct-sourcing | Direct sourcing spans existing networks and the marketplace, with skill and availability discovery. | Combine a trusted roster with opted-in discovery; show when availability was confirmed. |
| Worksome, https://www.worksome.com/solutions/sourcing-and-talent-pooling | Private pools, multiple sourcing channels, shortlisting and approval workflows. | Support roster-first sourcing and explicit approvals; avoid enterprise-level administration for small agencies. |
| ManyRequests, https://www.manyrequests.com/agency-project-management-software | Request assignment, creative review and workflow tools are presented as part of agency operations. | Connect finding a collaborator to the actual work and review journey. |
| ManyRequests help, https://help.manyrequests.com/en/articles/9469892-how-to-add-internal-comments | Internal comments have an explicit mode and visible label. | Separate agency-private, work-order and client-visible channels with server-side controls as well as clear labels. |
| Upwork help, https://support.upwork.com/hc/en-us/articles/360009524554-How-agency-finances-work | Agency contracts pay the agency; member compensation is agreed with the agency and member payments are not facilitated/protected by Upwork. | Model the subcontractor's agreement and payment status explicitly. Client payment protection is not automatically subcontractor protection. |
| Fiverr help, https://help.fiverr.com/hc/en-us/articles/31972197528337-Team-Account | Team members share order/message work with separate identities; the administrator receives payment and distributes member earnings outside Fiverr. | Preserve individual identities and independent, nonexclusive collaborations; distinguish a workspace member from a project supplier. |
| Mostaql help index, https://support.mostaql.com/category/employers | The official index describes private hiring/rehiring and multiple freelancer hires under one public project. | Make a private work offer and rehire simple. Do not infer joint contracts or split settlement from multi-hire. |

The Mostaql comparison is limited to the accessible help index. No competitor pricing, settlement speed, market share, guaranteed conversion lift or compliance coverage is imported into this plan.

## What would make this upgrade meaningfully better for its target users?

H1: one structured work inquiry and evidence-led shortlist reduce steps versus the current Sawwiq partnership/contact handoff.
H2: fresh, explicit availability reduces wasted invitations without representing unknown availability as confirmed capacity.
H3: an audience preview plus separate work-order/client channels reduces accidental information disclosure.
H4: reusable private rosters and work templates increase repeat engagements.
H5: Arabic-first creative deliverable templates reduce clarification and scope-change friction.

Test these against a measured current-Sawwiq baseline first. Any public competitor superiority claim needs comparable hands-on research and disclosed methodology; feature count alone is not evidence.

## Repository evidence used for this plan

All paths below were read at `2a4178b7b216f1fa8868a1f6dfc550a882851ab3` in this conversation or its immediately preceding research; implementing Claude must refresh them before editing:

- `app/[locale]/(main)/studio/partners/page.tsx`: suggestions UI is agency-only; accepted partners can create/request existing partner contracts; the partners feature gate is respected.
- `lib/data/partners.ts`: role-based suggestions and acceptance-controlled contact sharing; inspected scoring does not use booking availability or negotiated supplier rates.
- `docs/14-contracts-and-milestones.md`: supplier is `contracts.agency_id`, purchasing agency is `client_agency_id`; existing signed terms, review deadlines, revisions, change requests and payment modes.
- `docs/40-collaboration.md`, `lib/data/milestone-shares.ts`: accepted partners, a single live share per milestone, fixed/percentage share, disclosed client delivery and direct/protected distinctions.
- `lib/payments/readiness.ts`: real-provider and explicit-live gates. This inspection did not verify live production settings or payment-partner capability.
- `docs/11-build-stages.md`, `docs/12-ai-matchmaker.md`: reuse Drizzle/PGlite, existing auth, storage and deterministic matching/tool boundaries.
- `docs/10-monetization.md`, `docs/45-founder-launch-readiness.md`: free-launch and approved Founder behavior must survive. Older benchmark prices in internal docs are not current competitor research.
- `lib/release.ts`, `.github/workflows/vercel.yml`: existing release identity and deployment tooling; runtime availability was not inferred from main's SHA.
- `AGENTS.md`, `CLAUDE.md`, `package.json`: repository conventions and actual commands; no dependency upgrade is justified by this plan.
