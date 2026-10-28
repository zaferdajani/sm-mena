# 62 · The help chat

A **Help** button sits in the bottom corner of every page: the app, the front page and the example pages. On phones it sits above the bottom menu. It is hidden on pages that have their own bottom bar or need full focus: `/support`, the AI matchmaker, first-run setup, chats, Studio imports and messages, admin, and the printable letters. It opens a short chat in the page's language.

## What it does

- **How do I…?** It matches the question against the help topics (`lib/help/topics.ts`, answers in `messages/*.json` → `Help.topics`). Each answer links to its page. If nothing matches, or the answer didn't help, it offers to send the question to the team.
- **Something is broken / complaint / suggestion.** It asks what happened, what the person did before it happened, and what they expected (each can be skipped, and each can be dictated), then offers a screenshot, a voice note and a screen recording. It then shows the draft. **Nothing is sent until the person taps "Send the report".**
- **Sending** files the report through the same action as the `/support` form (`submitSupportAction`). The report gets its type, the page, the screen size, the app version and the screenshot, and the person sees the report number. The bug agent picks it up on its next hourly run (docs/61).
- **No email.** A report filed from the chat keeps no address, even for a signed-in account: it is followed in the chat, so no receipt or status email is sent. People who want answers by email use **Contact support** (`/support`, the header icon and the footer link), which emails a receipt and every status change (`replyAddress`, `lib/data/bugs.ts`).
- **Choosing between them.** `/support` opens with "How would you like to reach us?": **Chat now** opens this chat on the page (no floating button there) and **Email support** jumps to the form. The chat's footer offers the way back ("Prefer a reply by email? Email support"). `openHelpChat()` (`lib/help/open-event.ts`) opens the chat from any page.
- **Follow-up.** The browser remembers the report numbers it sent (`localStorage`, convenience only). Reopening the chat shows each one's status: received, waiting on a decision, fixed or closed. The server answers only for reports sent from the same browser or account (`reportStatusAction`).

## Two modes

- **Guided** (the default, no AI provider needed): buttons and short questions in the browser.
- **Conversation**: free text with Claude (`lib/ai/help-assistant.ts`). It turns on by itself when `ANTHROPIC_API_KEY` is set in Vercel, unless `AI_PROVIDER` is `basic`, `off` or `mock`, or `HELP_AI=off`. The model is `HELP_MODEL` (default `claude-opus-5-5`, low effort, server-side refusal fallback).
  - Claude answers only from the help topics and drafts the report with the `propose_report` tool. The person still confirms the draft.
  - Emails and phone numbers are removed from what the person types before it reaches the model.
  - The chat says the answers come from an AI assistant and can be wrong.
  - At most 30 turns per 10 minutes per visitor.
  - If the model fails or declines, the chat continues in guided mode.

## Files

`components/support/help-chat.tsx` (the widget), `app/[locale]/(main)/help-actions.ts` (conversation turn and report status), `lib/help/topics.ts`, `lib/ai/help-assistant.ts`, `tests/unit/help-topics.test.ts`, `tests/e2e/help-chat.spec.ts`.
