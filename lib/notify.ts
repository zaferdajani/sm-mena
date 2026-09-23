import "server-only";
import type { Agency, Inquiry } from "@/lib/db/schema";

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
