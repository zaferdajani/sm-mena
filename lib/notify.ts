import "server-only";
import type { Agency, Conversation, Inquiry } from "@/lib/db/schema";

// Notification adapter. With RESEND_API_KEY set, emails the agency about a new
// inquiry; otherwise logs it (mock). WhatsApp Business notifications can be
// added here later behind WHATSAPP_PROVIDER.
export async function notifyNewInquiry(agency: Agency, inquiry: Inquiry) {
  const to = agency.email;
  const key = process.env.RESEND_API_KEY;
  const subject = `رسالة جديدة على سوّق · New inquiry from ${inquiry.name}`;
  const text = [
    `${inquiry.name} (${inquiry.phone})${inquiry.businessName ? ` · ${inquiry.businessName}` : ""}`,
    "",
    inquiry.message,
    "",
    `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/ar/studio/inbox`,
  ].join("\n");
  if (!key || !to) {
    if (process.env.NODE_ENV !== "test") console.info(`[notify:mock] inquiry for @${agency.handle}`);
    return;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Sawwiq <noreply@sawwiq.jo>", to, subject, text }),
  });
}

/**
 * New chat message from a client. Throttled by the caller to one email per
 * conversation per 15 minutes; the message text stays in Sawwiq (the email
 * only links to the thread). Logs a mock line without RESEND_API_KEY.
 */
export async function notifyNewMessage(agency: Agency, conversation: Pick<Conversation, "id" | "clientName">) {
  const to = agency.email;
  const key = process.env.RESEND_API_KEY;
  const subject = `رسالة جديدة على سوّق · New message from ${conversation.clientName}`;
  const text = [
    `${conversation.clientName} sent you a message on Sawwiq. · أرسل لك ${conversation.clientName} رسالة على سوّق.`,
    "",
    `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/ar/studio/messages/${conversation.id}`,
  ].join("\n");
  if (!key || !to) {
    if (process.env.NODE_ENV !== "test") console.info(`[notify:mock] chat message for @${agency.handle}`);
    return;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Sawwiq <noreply@sawwiq.jo>", to, subject, text }),
  });
}
