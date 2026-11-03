# Incident response: personal-data breaches

Applies to Sawwiq (sawwiq.org). Draft for owner review; fill the placeholders before relying on it.

## Contacts (owner to fill in)

| Role | Name | Email | Phone |
|---|---|---|---|
| Incident lead (owner) | [NAME] | [EMAIL] | [PHONE] |
| Backup | [NAME] | [EMAIL] | [PHONE] |
| Privacy mailbox | privacy@sawwiq.org | | |
| Legal adviser | [NAME] | [EMAIL] | [PHONE] |
| Hosting / database support | Vercel, Supabase dashboards | | |

## 1. Detection

Signals that may mean a breach: error spikes or odd rows in Admin → Errors; unexpected `audit_logs` entries (staff viewing contact data, `account.export` bursts); Supabase or Vercel security alerts; a leaked key reported by GitHub secret scanning; a report through Support or privacy@sawwiq.org; a provider (Anthropic, OpenAI, Resend, Supabase, Vercel) announcing an incident.
Anyone who suspects a breach tells the incident lead immediately. Note the time you learned of it: the 72-hour clock starts when Sawwiq becomes aware.

## 2. Containment (first hours)

1. Open an incident record (date, who found it, what is known). Do not put personal data in it.
2. Stop the leak: rotate the exposed secret (`DATABASE_URL` password, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`, `MFA_ENCRYPTION_KEY`, `SOCIAL_TOKEN_KEY`); disable the affected account (set `users.disabled_at`, which signs it out); switch the affected feature off in Admin → Features; revoke sessions (`destroyAllSessions`).
3. Preserve evidence: export `audit_logs` and Vercel/Supabase logs for the period; do not delete anything.
4. Establish scope: which tables and files, which people, which kinds of data (contact details, messages, contracts, documents), and whether the data was readable (encrypted, hashed) or not.
5. Fix the cause, then deploy and verify.

## 3. Assess risk

Notification is required unless the breach is unlikely to put people at risk. Record the reasoning either way. Higher risk: contact details, chat content, contracts, identity documents, credentials.

## 4. Notify

| Who | When | How |
|---|---|---|
| Saudi Data & AI Authority (SDAIA), if Saudi residents' data is affected | Within **72 hours** of becoming aware, when the breach may harm people or their rights | SDAIA's breach-notification channel (check the current form on sdaia.gov.sa). Include nature, categories and approximate numbers, likely consequences, measures taken, contact. |
| Jordan's data-protection authority, if Jordan residents are affected | As its rules require (confirm with legal adviser) | Its published channel. |
| EU/EEA/UK supervisory authority (GDPR art. 33), if people there are affected | Within **72 hours** of awareness; late notices need reasons | The authority of the lead EU member state or of the affected people. |
| Affected people (PDPL art. 20 / GDPR art. 34) | Without undue delay when risk is high | Email from privacy@sawwiq.org and an in-app notice, in Arabic and English: what happened, what data, what we did, what they should do (change password, watch for phishing), who to contact. |
| Payment partner, AI and hosting providers | As their agreements require | Per DPA (docs/DPA_CHECKLIST.md). |

If not everything is known within 72 hours, send what you have and add details later in phases.

## 5. After the incident

1. Write a post-mortem within 14 days: timeline, root cause, data and people affected, decisions, fixes.
2. Keep the incident record, the notifications and the risk reasoning for at least 5 years.
3. Update this plan, `docs/08-legal-compliance.md` and the policy if anything changed.
4. Rehearse once a year: pick a scenario, walk through steps 1 to 4 and time it.

## Note on tooling

Sawwiq has no `breach_incidents` table. Incidents are tracked in the incident record above and in `audit_logs`. If volume justifies it later, add a table and an email alert through the existing mailer (`lib/notify.ts`).
