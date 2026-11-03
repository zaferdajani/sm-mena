# Data processing agreements and transfer paperwork (owner to complete)

Sawwiq must have a written DPA (PDPL art. 8 / GDPR art. 28) with each vendor that processes personal data for it, plus a transfer mechanism where data leaves Saudi Arabia, Jordan, the EEA or the UK (standard contractual clauses, SCCs; UK addendum). Most vendors offer a click-through DPA that already includes SCCs. Tick when signed and store the PDF outside the repository.

| Vendor | Role | Personal data involved | DPA / SCCs | Where to sign | Signed | Date |
|---|---|---|---|---|---|---|
| Vercel Inc. | Hosting, logs (London region) | All traffic, IP addresses | DPA with SCCs | vercel.com/legal/dpa | [ ] | |
| Supabase Inc. | Postgres + Storage (eu-west-2 London) | All account, content, files | DPA with SCCs | supabase.com/legal/dpa | [ ] | |
| Anthropic PBC | AI (Claude) | Request and question text (no phones or emails) | Commercial terms DPA with SCCs; confirm zero-retention / no-training | anthropic.com/legal | [ ] | |
| OpenAI OpCo, LLC | AI (fallback provider) | Same | API DPA with SCCs; confirm no training on API data | openai.com/policies | [ ] | |
| Resend, Inc. | Transactional email | Recipient email, message text | DPA with SCCs | resend.com/legal/dpa | [ ] | |
| Google LLC (Places API) | Address lookups | Search text | Google Cloud Data Processing Addendum | cloud.google.com/terms/data-processing-addendum | [ ] | |
| Google LLC (Analytics 4) | Optional analytics, only after consent | Pseudonymous usage, IP | Google Ads Data Processing Terms; turn on IP anonymisation and shortest retention | Admin → Data collection in GA4 | [ ] | |
| Licensed payment partner (to be chosen, docs/32) | Payments, payouts | Payer/payee details, amounts | Partner's DPA; confirm its licence and data location | With the partner | [ ] | |
| GitHub (Actions, maintenance) | Runs maintenance jobs; holds repository | No production personal data stored | Standard terms; keep secrets in Actions secrets only | github.com/customer-terms | [ ] | |

Also:
- [ ] Record the transfer risk decision for the US vendors (Anthropic, OpenAI, Resend, Google): SCCs plus the minimisation already in code (no phones or emails to AI). Keep a one-page note per vendor.
- [ ] Check each vendor's subprocessor list and subscribe to change notices.
- [ ] Keep `/subprocessors` (messages `PolicySubprocessors`) in sync with this table; replace the payment-partner placeholder once chosen.
- [ ] Register with SDAIA / Jordan's authority if required for the controller (ask the legal adviser).
