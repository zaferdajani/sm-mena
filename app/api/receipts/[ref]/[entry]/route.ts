import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAgency, getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { receiptsOf } from "@/lib/contracts/receipts";
import { audit } from "@/lib/data/agencies";
import { getContractById, getContractByToken, type ContractView } from "@/lib/data/contracts";
import { receiptDocument } from "@/lib/legal/receipt";
import { renderLegalPdf } from "@/lib/pdf/legal-pdf";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export const dynamic = "force-dynamic";

/**
 * The PDF receipt for one deposit, payout or refund on a protected contract.
 * `ref` is the client's private token, or the contract id for the agency that
 * owns it, the agency buying it (partner contracts) or staff who handle
 * payments (audited). `entry` is the ledger entry id.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/receipts/[ref]/[entry]">) {
  const { ref, entry } = await ctx.params;
  if (!rateLimit(`receipt-pdf:${await clientIp()}`, 60, 10 * 60 * 1000)) return new NextResponse("Too many requests", { status: 429 });
  const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "ar";
  const id = Number(entry);
  if (!Number.isInteger(id) || id <= 0) return new NextResponse("Not found", { status: 404 });

  let v: ContractView | null = null;
  if (/^[0-9a-f-]{36}$/.test(ref)) {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Not found", { status: 404 });
    v = await getContractById(ref);
    const agency = await getCurrentAgency();
    const party = v && agency && (agency.id === v.contract.agencyId || agency.id === v.contract.clientAgencyId);
    const staff = can(user.role, "escrow.resolve") || can(user.role, "payments.view");
    if (!v || (!party && !staff)) return new NextResponse("Not found", { status: 404 });
    if (!party) await audit(user.id, "receipt.pdf_view", "contract", ref, { entry: id });
  } else {
    v = await getContractByToken(ref);
  }
  const receipt = v ? receiptsOf(v).find((r) => r.id === id) : null;
  if (!v || !receipt) return new NextResponse("Not found", { status: 404 });

  const doc = receiptDocument(receipt, v.contract, { agency: v.contract.agencyLegalName || v.agency.name, client: v.clientAgency?.name ?? v.contract.clientName }, lang);
  const pdf = await renderLegalPdf(doc);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${receipt.number}-${lang}.pdf"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
      "referrer-policy": "no-referrer",
    },
  });
}
