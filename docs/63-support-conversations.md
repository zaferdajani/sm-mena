# 63 · Support conversations

Every problem report is a conversation between the person who sent it and Sawwiq support. The bug agent (docs/61) answers there, and so can staff. The reporter reviews the fix and says whether it works.

## The reporter's side

- **Their link.** Each report has a private link, `/support/t/<token>`. The token is random and reaches that one report only. They find it in three places: "Your reports" in the help chat (docs/62), "Your reports" on `/support` (reports from the same browser or account), and every email about the report (the receipt, status changes and replies). An email never contains the reply text, only the link.
- **Their notification centre.** The receipt, every status change (being worked on, handled, waiting for you) and every reply also appear as a notification in the Studio bell (an agency's report) or the device bell at `/notifications` (anyone else), with the report number and the link, never the text (`lib/data/support-inbox.ts`; one unread notice per report and kind, the latest replacing the earlier). The bug agent's writes from the workflow add them too (`lib/db/bug-queue.ts`). A report with neither an account nor a device cookie gets email only.
- **The conversation.** It shows the report, its files, every reply and their own follow-ups.
- **Replying.** They can reply at any time with text (typed or dictated), a screenshot, a voice note or a screen recording (`thread-actions.ts`). A reply sets the report back to **New**, so the agent's next hourly run takes it again with the whole conversation.
- **Reviewing a fix.** When a report is **Done** they see two buttons. "It works now" records the confirmation, and Admin → Bugs shows it. "Still broken" opens the reply box.
- **Unread replies.** A red dot appears on the Help button and in "Your reports" until they open the conversation.

## Support's side

- **The bug agent** answers each report it handles, in the reporter's language, with what it found and what to try (docs/61, step 10). To ask for something it needs, it sets **Waiting for you**, and their answer brings the report back to it.
  - Replies reach the database sealed to the site's reply key, which the Bug queue workflow creates once and keeps in `app_settings`. The workflow inputs and logs on this public repository therefore hold ciphertext and counts only.
- **Staff** reply from Admin → Bugs, below each report, optionally setting a status. Every reply is audited (`support.agent_reply`, `support.staff_reply`, `support.reporter_reply`, `support.reporter_confirmed`).
- **Reply emails** go once per reply (`support_messages.emailed_at`), from the site, which holds the email key. They are sent right after a staff reply, when the Bug queue workflow finishes writing replies, and on the half-hourly site check. A reply email stands in for the status email of the same report.

## Data

`support_messages` (`request_id`, `author` reporter | agent | staff, `body`, files, `emailed_at`); `support_requests.access_token`, `reporter_unread`, `confirmed_at`; status `waiting`. Migration 0040 (idempotent; existing reports get their link). Retention is unchanged: the report and its whole conversation, with every file, are deleted 12 months after it is handled (docs/08).
