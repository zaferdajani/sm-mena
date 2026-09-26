# 34. Feature switches (Admin → Features)

Admin → Features works like the switchboard in the OneClickConvert console. Owners and admins can set each part of the platform to one of three states:

| State | What people see |
|---|---|
| **On** | Everyone can use it. |
| **Coming soon** | Visitors see "Coming soon / under construction" instead of the feature. Pilot agencies (listed by handle) and staff can use it now. |
| **Off** | Hidden everywhere. Links that lead to it (for example the matchmaker on the landing page) go to Explore instead. |

Things that already exist keep working whatever the switch says: a signed contract, an NDA or a conversation is never cut off.

## Behaviour

- **Saving.** Changes apply within seconds; each server keeps a 15-second cache. Every change is logged in the audit log (`feature.set`).
- **Where settings live.** In the `app_settings` table under the key `features`. The defaults, before anyone saves, are in `defaultFeatures()` in `lib/features.ts`.
- **Test servers.** `FEATURE_DEFAULTS="key=state,…"` sets a different starting point. The e2e server starts with `protected_payments=on` so the contract suites can run.
- **Where it's enforced:**
  - **Pages:** `featureGate()` returns open, soon (show `<ComingSoon>`) or off (404 or redirect).
  - **Server actions:** `canUse()` makes them return `unavailable`.
  - **Entry points:** navigation links and buttons are hidden when a feature isn't open.

## The features

| Key | Default | When not open |
|---|---|---|
| `protected_payments` | coming soon | New contracts are **direct**: the client pays the agency, with no Sawwiq fee. Pilots get protected (test-mode) contracts. |
| `paid_plans` | coming soon (`on` if `MONETIZATION_ENABLED=true`) | No plan checkout, and no paid ranking boost. Pilots can buy through the checkout. |
| `contracts` | on | "New contract" shows Coming soon; existing contracts work. |
| `ndas` | on | "New NDA" shows Coming soon. |
| `quote_requests` | on | The request form, "Get quotes" on hire pages and the matchmaker's "send my project" step are hidden. |
| `ai_matchmaker` | on | `/match` shows Coming soon (off: redirects to Explore); the nav item and home CTA are hidden; `/api/match` answers 404. |
| `messaging` | on | The "Message" button on agency pages is hidden. |
| `reviews` | on | Review invite and review links show Coming soon; creating invites is refused. |
| `partners` | on | Studio → Partners shows Coming soon (off: hidden from the studio menu). |
| `demo_view` | on | "Explore the demo" is hidden; off also ignores an existing demo cookie. |

## Protected payments: the go-live checklist

The same page shows the go-live checklist for protected payments (`lib/golive.ts`):
- the owner ticks the real-world steps;
- the system checks the technical ones (partner connected, webhook secret, daily job, email, staff 2FA, live switch).

Real money needs both:
- the feature switched on (or the agency listed as a pilot);
- the deployment's `PROTECTED_PAYMENTS_LIVE=true` with a real partner.

See docs/33-protected-payments-go-live.md.
