# 23 · Chat, opportunities feed and notifications

Clients and agencies can talk inside Sawwiq, every chat is kept as a log for quality assurance and disputes, and both sides are told about the events that matter to them. The design adapts TeamManager's supplier chat (`ChatThreadView`, per-side read cursors, append-only event log) to Sawwiq, where clients have no accounts.

## Who can talk to whom

| Conversation | Starts when | Client side | Agency side |
|---|---|---|---|
| About a project request | The agency has sent a proposal on the request (briefs stay anonymous until then). Either side opens it: the client from the proposal card ("Chat"), the agency from the opportunity ("Message the client"). | The device that posted the request (`sw_vid` cookie) or anyone with the request's private link (`/r/[token]`). | The agency that sent the proposal. |
| From an inquiry | A visitor sends an inquiry from an agency page. The inquiry text becomes the first message. | The device that sent the inquiry. | The agency. |

One conversation per (request, agency) and per inquiry, enforced by unique indexes. Staff read transcripts in the admin console; they never write in them.

## Recording notice

Every thread shows a banner above the messages, before anything can be sent:

> Chats on Sawwiq are recorded and may be reviewed by our team for quality assurance and to resolve disputes. Don't share passwords or payment details.

A shorter reminder sits under the composer, and the inquiry form says that an inquiry also starts a recorded chat. The text is versioned by `CHAT_NOTICE_VERSION` (`lib/chat.ts`); each conversation stores the version shown (`notice_version`). Change the version whenever the wording changes.

## Data model (`lib/db/schema.ts`, migration `0008_conversations`)

- `conversations`: agency, request / proposal / inquiry, the client's visitor id and name snapshot, status (`open`, `closed`, `blocked`), `last_message_id` / `last_message_at`, one read cursor per side (`agency_last_read_id`, `client_last_read_id`), and `agency_emailed_at` for the email throttle.
- `conversation_messages`: `bigserial` id (the keyset for paging and read cursors), side (`client`, `agency`, `system`, `staff`), sender account or visitor id, body (1–2000 characters, checked in Zod and by a `CHECK` constraint), hashed IP, and `hidden_at` / `hidden_by` for moderation.
- `notifications`: recipient agency **or** visitor id, kind, params (display names only, never a phone number or email), link, `read_at`. The text is rendered at display time from `Notifications.kinds.<kind>` in the reader's language.

**Append-only log.** The trigger `sawwiq_chat_append_only` refuses any `UPDATE` except `hidden_at` / `hidden_by` (and clearing `sender_user_id` when a user is deleted), and refuses `DELETE` unless the message is older than 24 months or its conversation no longer exists (account erasure). What staff review is exactly what was sent.

## Sending and reading

- `sendChatMessageAction` (`app/[locale]/(main)/chat-actions.ts`) resolves the participant (`lib/chat-access.ts`), then `sendMessage` (`lib/data/conversations.ts`) validates the body, rate-limits (`chat:<side>:<actor>:<conversation>` 20 per minute, `chat:<ip>` 300 per day), and in one transaction inserts the message, moves `last_message_id` and the sender's read cursor, and notifies the other side.
- A client message emails the agency (`notifyNewMessage` in `lib/notify.ts`, Resend or a `[notify:mock]` log) at most once per conversation per 15 minutes, claimed atomically through `agency_emailed_at`. The email links to the thread and doesn't contain the message.
- Read cursors only move forward (`greatest`). "Seen" ticks compare a message id with the other side's cursor. Opening a thread marks it read and clears its notifications.

## Polling (no sockets)

The app runs on one auto-stopping Fly machine with PGlite or on serverless functions, so there are no WebSockets or server-sent events.

| Endpoint | Used by | Returns |
|---|---|---|
| `GET /api/conversations/[id]/messages?as=client\|agency&after=<id>` (`before=<id>` for older pages, `access=<token>` for private-link clients) | the thread | `{ messages, otherLastReadId, status }`; marks read up to the newest message returned |
| `GET /api/notifications/count` | the bell | `{ count }` for the signed-in agency, otherwise for this device |

The thread (`components/chat/thread.tsx`) polls every 3 s while someone is active (sending, receiving or typing in the last minute), 15 s when idle, 30 s after five minutes, and stops while the tab is hidden. Messages are sent optimistically and reconciled by id; a failed send can be retried. The bell polls every 60 s and after each navigation.

## Screens

| Who | Route | What |
|---|---|---|
| Client | `/r/[token]/chat/[handle]`, `/requests/[id]/chat/[handle]` | Thread with one agency that quoted; "Chat" button on each proposal card (red dot when unread). |
| Client | `/chats`, `/chats/[id]` | All chats on this device, including inquiry chats. |
| Client | `/requests` | Unread badge per request. |
| Client | `/notifications` | New quotes and replies. |
| Agency | `/studio/opportunities` | Feed of open requests (newest first) with services, budget in the request country's currency, city and country, timeline, "Invited" and "New" tags, "Quote now". The tab badge counts matched requests not opened yet (`request_matches.viewed_at`). Seeded demo requests (`source = 'demo'`) are shown to demo agencies only. |
| Agency | `/studio/opportunities/[id]` | "Message the client" once the agency has sent a quote. |
| Agency | `/studio/messages`, `/studio/messages/[id]` | Thread list with unread dots (tab badge = unread conversations) and the thread. Inquiry threads link back to the inbox for contact details, and the inbox links to the thread. |
| Agency | `/studio/notifications` | Invitations, messages, accepted and declined quotes, inquiries. |
| Everyone | header bell | Phone header next to the help icon; desktop sidebar under the menu. |
| Staff | `/admin/conversations`, `/admin/conversations/[id]` | Needs `conversations.view` (owner, admin, support). List filtered by agency handle; read-only transcript with hide / unhide per message. Opening a transcript and each hide are audited. |

## Notifications

| Kind | Recipient | Created by |
|---|---|---|
| `request_invited` | agency | `createProjectRequest`, for the invited top matches (demo requests only reach demo agencies) |
| `proposal_received` | client device | `submitProposal` |
| `proposal_accepted` / `proposal_declined` | agency | `setProposalStatus`; accepting one quote declines and notifies the others |
| `inquiry` | agency | `createInquiry` (with the new conversation) |
| `message` | the other side | `sendMessage`; one unread notification per conversation, bumped with a count |

Pages mark notifications read when they are shown. Viewing a thread clears that thread's notifications.

## Retention

`GET /api/cron/retention` (Vercel Cron, `CRON_SECRET`) deletes messages older than 24 months and notifications older than 90 days. See `docs/08-legal-compliance.md`.

## Not built (on purpose)

End-to-end encryption (staff must be able to review), typing and presence indicators, reactions, voice notes, attachments, group chats and editing or deleting messages.
