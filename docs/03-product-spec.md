# 03 · Product Specification (PRD)

> **Update (September 2026):** v1 ships the simpler Instagram-style showcase model in `09-benchmark-and-model.md`. The brief-and-proposal flow below moves to a later phase.

Scope: Phases 1–3 as defined in `01-business-plan.md`. Everything is Arabic-first with English as a full second locale. Mobile-first. Right-to-left layout is the default.

---

## 1. Personas

| Persona | Who | Goal | Device | Key anxiety |
|---|---|---|---|---|
| **Business owner (buyer)** | Owner or manager of an SME: restaurant, clinic, boutique, real-estate office, school, e-commerce store. 25–50 years old. Arabic-first. | Find a trustworthy agency at a fair price without wasting a week on calls | Phone, arriving from Instagram/Facebook ad or Google | "Will I get scammed? What is a fair price?" |
| **Agency owner / BD lead (seller)** | Founder or business developer at a 2–40 person agency in Amman (or Irbid, Zarqa, Aqaba) | Get qualified leads cheaply and prove credibility | Laptop for proposals, phone for notifications | "Are these leads real? Is my competitor listed above me?" |
| **Ops admin (Sawwiq staff)** | Ops & sales lead | Verify agencies, qualify briefs, route, resolve issues, see metrics | Laptop | "Did every brief get responses within 48h?" |

---

## 2. User journeys

### 2.1 Buyer: get proposals
1. Lands on home or a city/service page (Arabic).
2. Taps "احصل على عروض" (Get proposals). Brief form, 6 steps, one question per screen:
   - Business type (chips: restaurant, clinic, retail, real estate, education, beauty, e-commerce, services, other)
   - What do you need (multi-select from service taxonomy)
   - Platforms (Instagram, Facebook, TikTok, Snapchat, LinkedIn, YouTube, Google)
   - Monthly budget band (under 300 / 300–600 / 600–1,200 / 1,200–2,500 / 2,500+ JOD / not sure)
   - City and timeline (ASAP / this month / within 3 months)
   - Free-text description (optional) and name, business name, phone
3. Phone OTP. Account created implicitly.
4. Confirmation: "Verified agencies will send proposals within 48 hours." Link to a dashboard.
5. Notifications by WhatsApp/SMS and email when proposals arrive.
6. Compare proposals side by side. Open chat with any agency. Mark one as hired (Phase 2) or accept and pay (Phase 3).
7. Leave a review after 30 days (only if hired through platform).

### 2.2 Seller: claim, verify, respond
1. Receives outreach or finds their seeded profile. Taps "هذه وكالتي" (This is my agency).
2. Sign up with phone + email. Claim requires a work email matching the agency domain OR admin approval.
3. Complete profile: logo, description (ar/en), services, packages with prices, industries, cities served, team size, founded year, portfolio (images/links), social links.
4. Submit verification: Companies Control Department certificate (PDF/image), registration number, two client references (name, phone, project). Admin reviews. Status: Unverified → Pending → Verified (or Rejected with reason).
5. Receives brief notifications (WhatsApp + email) matched to services/budget/city.
6. Opens brief, sees anonymised details (business type, needs, budget band, city; contact revealed after response). Pays lead fee (or is Pro) and submits proposal via template.
7. Chats with buyer. Marks outcome (won / lost / no response). Phase 3: signs contract, receives milestone payouts.
8. Dashboard: response rate, response time, win rate, reviews, ranking factors, billing.

### 2.3 Admin
- Verification queue with document viewer and checklist.
- Brief moderation queue: approve / reject / request more info; edit budget band; set match set manually (Phase 1) or override automatic set (Phase 2).
- Agency list with status, plan, metrics; suspend/unsuspend.
- Review moderation.
- Disputes (Phase 3).
- Metrics: briefs/day, qualification rate, response rate within 48h, hires, revenue, agencies by status.

---

## 3. Feature list by phase

### Phase 1 (Months 3–6) — Directory + briefs
- [ ] Bilingual site shell (ar default, en), RTL/LTR switch, SEO metadata per locale
- [ ] Public agency directory: list, filters (service, city, budget band, verified only), sort (verified, response time, reviews)
- [ ] Agency profile page with packages, portfolio, badges
- [ ] Service taxonomy (`data/service-taxonomy.json`) and city list
- [ ] Seed import of agencies from CSV (`data/agency-seed-template.csv`)
- [ ] Claim flow + agency auth (phone OTP + email)
- [ ] Agency profile editor
- [ ] Verification submission + admin verification queue
- [ ] Brief form (6-step) + buyer phone OTP
- [ ] Brief moderation queue; manual routing to selected agencies
- [ ] Notifications: email (Resend) + WhatsApp/SMS (provider adapter; start with SMS via a Jordanian gateway, WhatsApp Business API when approved)
- [ ] Agency brief inbox; proposal template submission (no fee yet)
- [ ] Buyer dashboard: proposals list, compare view
- [ ] Admin metrics page
- [ ] Legal pages: terms (buyer, agency), privacy (PDPL-compliant), consent capture at signup and brief submission
- [ ] Analytics events (PostHog or Plausible)

### Phase 2 (Months 7–12) — Marketplace
- [ ] Automatic matching engine (rules-based scoring, see §5) with admin override
- [ ] Lead fee wallet: agencies top up (card via PSP, or manual CliQ transfer confirmed by admin); fee deducted per response; refunds
- [ ] Pro subscription: monthly billing via PSP recurring or eFAWATEERcom invoice; feature flags for Pro benefits
- [ ] In-app chat (buyer ↔ agency) with file attachments
- [ ] Outcome tracking (hired / not) and 30-day review prompt
- [ ] Reviews with moderation; rating aggregate on profile
- [ ] Agency dashboard analytics and ranking factor transparency
- [ ] Response-time SLA tracking; auto-expire briefs after 7 days
- [ ] Referral badge/widget for agencies ("Get a quote via Sawwiq")
- [ ] City and service landing pages generated from data (SEO)

### Phase 3 (Months 13–18) — Transaction rail
- [ ] Standard service agreement (ar/en) generated from accepted proposal; e-signature (checkbox + OTP per Electronic Transactions Law)
- [ ] Escrow via licensed PSP split/marketplace product; milestone definition; buyer funds milestone; release on approval or 7-day auto-release
- [ ] Agency payouts (bank/CliQ) and statements
- [ ] Disputes: raise, evidence, admin decision, partial release
- [ ] Commission accounting and invoices (tax-compliant, JOD)
- [ ] Buyer "hire again" and repeat briefs

---

## 4. Data model (entities)

```
User            id, phone (unique), email, name, locale, role[buyer|agency|admin], consent_at, created_at
Agency          id, slug, name_ar, name_en, description_ar/en, logo_url, city, cities_served[], founded_year,
                team_size_band, website, instagram, facebook, tiktok, linkedin, status[seeded|claimed|pending|verified|suspended],
                plan[free|pro], plan_renews_at, response_rate, avg_response_hours, rating_avg, rating_count, is_founding_member
AgencyMember    agency_id, user_id, role[owner|member]
Service         id, key, name_ar, name_en, category (from taxonomy)
AgencyService   agency_id, service_id, min_budget_band, max_budget_band
Package         id, agency_id, title_ar/en, description, price_jod, billing[monthly|one_off], deliverables[], service_id
PortfolioItem   id, agency_id, title, image_url, link, industry
Verification    id, agency_id, ccd_number, certificate_url, references[{name, phone, project}], status, reviewed_by, reviewed_at, notes
Brief           id, buyer_user_id, business_name, business_type, services[], platforms[], budget_band, city, timeline,
                description, status[submitted|qualified|rejected|routed|closed|expired], qualified_by, routed_at, expires_at
BriefMatch      brief_id, agency_id, score, source[auto|manual], notified_at, viewed_at
Proposal        id, brief_id, agency_id, scope, deliverables[], price_jod, billing, timeline, team, case_studies[], status[sent|shortlisted|hired|declined], lead_fee_charged, created_at
Conversation    id, brief_id, agency_id, buyer_user_id
Message         id, conversation_id, sender_user_id, body, attachments[], read_at
Outcome         brief_id, agency_id, result[hired|lost|no_response], reported_by, reported_at
Review          id, brief_id, agency_id, buyer_user_id, rating 1–5, body, status[pending|published|removed]
WalletTxn       id, agency_id, type[topup|lead_fee|refund|subscription], amount_jod, ref, created_at
Contract        id, proposal_id, terms_snapshot, signed_buyer_at, signed_agency_at, status            (Phase 3)
Milestone       id, contract_id, title, amount_jod, status[pending|funded|released|disputed], funded_at, released_at   (Phase 3)
Dispute         id, milestone_id, raised_by, reason, evidence[], decision, decided_by, decided_at    (Phase 3)
AuditLog        id, actor_user_id, action, entity, entity_id, before, after, created_at
```

PDPL: every table with personal data carries `consent_at`; deletion requests cascade or anonymise; audit log records access to phone numbers.

---

## 5. Matching rules (Phase 2)

Score each verified agency for a qualified brief; route top 5, minimum score 40, at least one non-Pro agency in every set (fairness).

| Factor | Points |
|---|---|
| Offers every requested service | +30 (partial: +10 per service, max 25) |
| Budget band overlaps agency package range | +20 |
| Same city, or serves city | +15 |
| Industry match in portfolio | +10 |
| Response rate ≥ 80% last 90 days | +10 |
| Avg response < 24h | +5 |
| Rating ≥ 4.5 with ≥ 3 reviews | +10 |
| Pro plan | +5 |
| Already received a brief today (load balancing) | −10 |
| Response rate < 40% | −20 |

Admin can pin/unpin agencies to a set. Log the score breakdown for transparency to agencies.

---

## 6. Non-functional requirements

- **Languages:** Arabic (default, RTL) and English. All strings in translation files; no hardcoded copy.
- **Performance:** Largest Contentful Paint under 2.5s on a mid-range Android over 4G. Directory pages statically rendered and revalidated.
- **Accessibility:** WCAG 2.1 AA basics; keyboard navigable; proper `dir` and `lang` attributes.
- **Security:** OTP rate limiting; row-level access rules; signed URLs for documents; no personal data in logs; secrets in environment.
- **Privacy (PDPL):** explicit consent records; privacy policy in Arabic; data export and deletion endpoints; contact-data access logged; data residency preference for EU/ME regions.
- **Reliability:** daily database backups; notification retries; idempotent webhooks from PSP.
- **Observability:** error tracking (Sentry), product analytics, admin metrics.

---

## 7. Out of scope (explicitly)

- Native mobile apps (PWA is enough for Phases 1–3)
- AI-generated proposals or automated agency selection without human confirmation
- Influencer marketplace
- Freelancer (individual) listings
- Multi-country in Phases 1–3 (design the schema with `country` on Agency and Brief, but launch Jordan only)
