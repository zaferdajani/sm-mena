import { adminAccess } from "@/lib/auth/policy";
import { adminMfaRequired } from "@/lib/auth/mfa";
import { getSessionUser } from "@/lib/auth/session";
import { listPayments, paymentsCsv } from "@/lib/data/payments";

// CSV export for accounting (Admin → Payments → Export).
export async function GET() {
  const user = await getSessionUser();
  if (adminAccess(user, adminMfaRequired(), "payments.export") !== "ok") return new Response("Forbidden", { status: 403 });
  const csv = paymentsCsv(await listPayments("all"));
  return new Response(`﻿${csv}\n`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="sawwiq-payments-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
