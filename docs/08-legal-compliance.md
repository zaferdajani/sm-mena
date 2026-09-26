# 08 · Legal and Compliance Checklist

Not legal advice. Confirm each item with a Jordanian lawyer before launch. Items marked **[Counsel]** need a formal opinion.

## 1. Company

- [ ] Register an LLC with the Companies Control Department (fee 0.2% of capital, min 250 JOD, plus 0.3% stamp). Activity: information technology services / electronic platform.
- [ ] Trademark search and registration for the brand name (Arabic and Latin) at the Ministry of Industry, Trade & Supply.
- [ ] Register `.jo` domain (requires Jordanian entity) and `.com`.
- [ ] Income and sales tax registration; e-invoicing readiness (JoFotara) for agency invoices.
- [ ] Chamber of Commerce membership.

## 2. Personal Data Protection Law No. 24 of 2023

In force since 17 March 2024, fully enforceable since 17 March 2025. Applies to digital platforms.

- [ ] Privacy policy in Arabic and English, plain language, versioned.
- [ ] Explicit consent captured and stored with timestamp and version at: signup, brief submission, sharing contact details with agencies, marketing communications (separate checkbox).
- [ ] Purpose limitation: contact details shared only with agencies that responded to that brief.
- [ ] Rights: access, correction, deletion, withdrawal of consent. Self-serve endpoints plus an email channel. 30-day response.
- [ ] Data map: what is stored, where (hosting region), for how long. Retention: briefs 24 months, messages 24 months, verification documents until agency leaves + 12 months.
- [ ] Cross-border transfer: choose hosting region and vendors deliberately; document them. **[Counsel]** on whether EU-hosted Supabase/Vercel is acceptable under the transfer rules.
- [ ] Appoint a responsible person (founder initially) as data protection contact.
- [ ] Breach procedure: detect, contain, notify Data Protection Council and affected users.
- [ ] Access logging for personal data views by staff.

## 3. Electronic Transactions Law No. 15 of 2015 (amended 2025)

- [ ] Terms of service accepted by click-through with timestamp and IP; record the terms version.
- [ ] Phase 3 contracts: e-signature by OTP confirmation is legally effective; keep signed snapshot immutable.

## 4. Consumer Protection Law 2017

- [ ] Most buyers are businesses, but sole traders may qualify as consumers. Terms should be fair, clear, and disclose that Sawwiq is an intermediary, not the service provider.

## 5. Marketplace terms

**Buyer terms:** free service; Sawwiq does not guarantee agency work; reviews policy; contact-sharing consent; dispute process (Phase 3).

**Agency terms:** verification obligations; accuracy of profile and prices; 48h response commitment; lead fee and refund rules; no off-platform solicitation of briefs received through Sawwiq for 12 months (enforceable via suspension, not damages); commission on escrow projects; data handling of buyer contacts (they become a data controller for what they receive); suspension and removal grounds.

**Review policy:** only from on-platform hires; agencies can respond publicly; removal only for abuse or verifiably false statements.

## 6. Payments and escrow **[Counsel]**

- Phase 2 (lead fees, subscriptions): ordinary merchant account with a CBJ-licensed PSP (MEPS, HyperPay, PayTabs). No licence needed to charge for your own services.
- Phase 3 (escrow): holding client money for third-party services may constitute a payment service under Central Bank of Jordan regulation. Options: (a) use a PSP's marketplace/split-payment product where the PSP holds funds, (b) partner with a licensed payment institution, (c) obtain a licence. Get a written opinion before building. Design the code so the platform never holds funds in its own bank account.
- Invoicing: agencies invoice buyers; Sawwiq invoices agencies for fees and commission with sales tax as applicable.
- Built today (docs/14): protected payments stay in **test mode** until a licensed payment partner is connected and `PROTECTED_PAYMENTS_LIVE=true` (`lib/payments/readiness.ts`); every screen and the contract terms say so, and no copy says Sawwiq holds money. Contract conditions 2026-10 (deemed acceptance, revision rounds, split decisions with one appeal, mutual cancellation, chargebacks with recovery from future payouts only after notice, IP per milestone, limits of protection) must be reviewed by counsel in each country before real money.

## 7. Content and advertising

- Agency portfolios must not include client work without permission; agency warrants this in terms.
- Paid ads must follow Meta/Snap policies; no misleading "guaranteed results" claims on the platform.

## 8. Employment

- Ops hire on a Jordanian employment contract with social security registration.
- Contractors (content, development) on written service agreements with IP assignment.

## Data added with the admin console (2026-09)

| Data | Why | Personal? | Retention |
|---|---|---|---|
| Page views (path, source, device type, language, time zone, random per-tab visit id, visitor cookie id) | Traffic statistics | Pseudonymous; no IP, no names | Delete after 13 months |
| Error reports (message, stack, route, user agent) | Fixing bugs | No (no query strings, no form data) | Until resolved + 6 months |
| "Report a problem" messages (text, optional email, page, user agent) | Support | Email if given | 12 months after handling |
| Two-factor secrets and backup codes | Account security | Encrypted secret, hashed codes | Until 2FA is turned off or the account is deleted |
| Payment records (agency name, amount, method, reference) | Accounting | Business data | As required by tax law (typically 7 years) |

## Data added with contracts v3 and NDAs (2026-09)

| Data | Why | Personal? | Retention |
|---|---|---|---|
| Drawn signature (PNG) and typed name of each signer | Electronic signature of a contract or NDA | Yes (biometric-like mark; not used for identification) | Signed record kept for at least 10 years after the contract ends, or as long as the law requires |
| Party legal name and commercial registration / ID number | Identify the parties so the contract is enforceable | Business data; an individual's ID number is personal | Same as the signed record |
| Hashed IP at signing (`sha256("sawwiq-sign:" + ip)`) | Evidence of the signing event | Pseudonymous | Same as the signed record |
| Client's change request / decline note on an NDA | Negotiation before signing | May contain personal data | Same as the document |

Consent: each signer ticks an explicit declaration (legal age, authority, agreement to sign electronically) before signing; the declaration text is versioned with `LEGAL_VERSION`. Staff downloads of contract/NDA PDFs are written to the audit log.

## Data added with the milestone system (2026-10)

See `docs/14-contracts-and-milestones.md`.

| Data | Why | Personal? | Retention |
|---|---|---|---|
| Client's visitor cookie id on a contract (`contracts.client_visitor_id`, set when the client signs through the private link) | Send contract notifications (deadlines, decisions) to the device that signed; the `/c/<contract id>` link opens only on that device | Pseudonymous | Same as the signed record |
| Dispute statements and evidence (text and links) from each side, admin decisions and reasons, appeal notes | Settle milestone disputes; evidence of what was decided and why | Yes (whatever people write) | Same as the signed record (at least 10 years after the contract ends); append-only |
| Mutual cancellation proposals (who proposed, per-milestone split, note) | Record of an agreed early end | May contain personal data in the note | Same as the signed record |
| Partner contract requests (title, brief, budget, the two agencies) | Ask a partner for a contract | Business data | Same as the contract, or 24 months if no contract follows |
| Receipts (built from the ledger; no new data) | Proof of deposits, payouts and refunds | Party names as in the contract | Same as the ledger |

Contract emails (deadline reminders, decisions) go only to an address the party gave in the contract; notifications never carry a phone number or email. Staff downloads of receipts are written to the audit log (`receipt.pdf_view`). Deemed acceptance after the review period is logged as a system decision (`escrow.auto_release`).

## Data added with chat and notifications (2026-09)

See `docs/23-chat-and-notifications.md`.

| Data | Why | Personal? | Retention |
|---|---|---|---|
| Chat messages between a client and an agency (text, side, time, sender account or visitor cookie id, hashed IP `sha256("sawwiq-chat:" + ip)`) | Let clients and agencies talk inside Sawwiq; quality assurance; evidence in disputes | Yes (whatever people write; pseudonymous ids) | 24 months from sending, then deleted by `/api/cron/retention`. Deleted earlier only with the whole conversation (e.g. an agency account erased on request). Messages cannot be edited or deleted by anyone before that (database trigger); staff can only hide one from the participants. |
| Conversation record (client's name snapshot, visitor cookie id, read positions, notice version) | Routing and unread counts | Pseudonymous; the client's first name as they typed it | Same as its messages |
| In-app notifications (kind, the other party's display name, link; never a phone number or email) | Tell an agency about invitations, messages, accepted or declined quotes and inquiries; tell a client's device about quotes and replies | Pseudonymous | 90 days, then deleted by `/api/cron/retention` |
| An inquiry's text copied as the first message of a chat | So the agency can answer inside Sawwiq | Same as the inquiry | Same as chat messages |

Transparency: every chat shows, before the first message can be sent, that chats "are recorded and may be reviewed by our team for quality assurance and to resolve disputes", with a reminder under the composer; the inquiry form says an inquiry also starts a recorded chat. The notice text is versioned (`CHAT_NOTICE_VERSION` in `lib/chat.ts`, currently `2026-09`) and each conversation stores the version its participants were shown. Staff access to transcripts needs the `conversations.view` permission (owner, admin, support); opening a transcript (`conversation.view`) and hiding or restoring a message (`conversation.hide` / `conversation.unhide`) are written to the audit log.

## Changing sign-in details (Security page)
Signed-in users can change their sign-in email and password from `/studio/security` or `/admin/security`. Both changes need the current password, plus the authenticator code when two-factor is on.
- The audit log records `account.email_changed` and `account.password_changed` without the addresses.
- A password change signs out every other session.
- Shared demo accounts can't change their sign-in details.
