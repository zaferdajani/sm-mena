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
