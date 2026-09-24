// Chat rules shared by the server and the browser (docs/23-chat-and-notifications.md).
import { z } from "zod";

/** Version of the "chats are recorded for quality assurance" notice; stored on each conversation. */
export const CHAT_NOTICE_VERSION = "2026-09";

export const MESSAGE_MAX = 2000;
export const messageBodySchema = z.string().trim().min(1).max(MESSAGE_MAX);

export type ChatSide = "client" | "agency";

/** A message as participants receive it (hidden messages lose their text). */
export type ChatMessage = {
  id: number;
  side: "client" | "agency" | "system" | "staff";
  body: string;
  hidden: boolean;
  createdAt: string;
};

/** Client access to a conversation: the visitor cookie, or a request's private link token. */
export type ChatAccess = { token?: string };

/** Polling rhythm: fast while people are typing and replying, slower when idle, stopped when hidden. */
export const POLL_ACTIVE_MS = 3_000;
export const POLL_IDLE_MS = 15_000;
export const POLL_AWAY_MS = 30_000;
export const ACTIVE_WINDOW_MS = 60_000;
export const IDLE_WINDOW_MS = 5 * 60_000;

export function pollDelay(sinceActivityMs: number) {
  if (sinceActivityMs < ACTIVE_WINDOW_MS) return POLL_ACTIVE_MS;
  if (sinceActivityMs < IDLE_WINDOW_MS) return POLL_IDLE_MS;
  return POLL_AWAY_MS;
}

export const NOTIFICATION_KINDS = ["message", "proposal_received", "proposal_accepted", "proposal_declined", "request_invited", "inquiry"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
