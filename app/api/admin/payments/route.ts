import { adminAccess } from "@/lib/auth/policy";
import { adminMfaRequired } from "@/lib/auth/mfa";
import { getSessionUser } from "@/lib/auth/session";
import { audit } from "@/lib/data/agencies";
import { testLedger, testLedgerCsv } from "@/lib/data/deactivation";
import { listPayments, paymentsCsv } from "@/lib/data/payments";

// CSV export for accounting (Admin → Payments → Export).
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (adminAccess(user, adminMfaRequired(), "payments.export") !== "ok") return new Response("Forbidden", { status: 403 });
  // Test-mode money movements, kept permanently (docs/32).
  if (new URL(request.url).searchParams.get("kind") === "test-ledger") {
    await audit(user!.id, "payments.export_test_ledger", "escrow_ledger");
    return new Response(`\uFEFF${testLedgerCsv(await testLedger())}\n`, {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="sawwiq-test-transactions-${new Date().toISOString().slice(0, 10)}.csv"` },
    });
  }
  const csv = paymentsCsv(await listPayments("all"));
  return new Response(`﻿${csv}\n`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="sawwiq-payments-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
