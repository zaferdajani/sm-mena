import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAgency, getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/data/agencies";
import { getContractById, getContractByToken, type ContractView } from "@/lib/data/contracts";
import { getNdaById, getNdaByToken, type NdaView } from "@/lib/data/ndas";
import { contractDocument, ndaDocument } from "@/lib/legal/document";
import { renderLegalPdf } from "@/lib/pdf/legal-pdf";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export const dynamic = "force-dynamic";

const isUuid = (v: string) => /^[0-9a-f-]{36}$/.test(v);

/**
 * The PDF copy of a contract or NDA. `ref` is the client's private token, or
 * the document id for the agency that owns it (or staff who can see contracts).
 * Never cached, never indexed; staff downloads are audited.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/legal/[kind]/[ref]">) {
  const { kind, ref } = await ctx.params;
  if (!rateLimit(`legal-pdf:${await clientIp()}`, 60, 10 * 60 * 1000)) return new NextResponse("Too many requests", { status: 429 });
  const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "ar";
  if (kind !== "contract" && kind !== "nda") return new NextResponse("Not found", { status: 404 });

  let found: ContractView | NdaView | null = null;
  if (isUuid(ref)) {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Not found", { status: 404 });
    found = kind === "contract" ? await getContractById(ref) : await getNdaById(ref);
    const ownerId = found ? ("contract" in found ? found.contract.agencyId : found.nda.agencyId) : null;
    // Partner contracts: the agency buying the work reads the same copy.
    const buyerId = found && "contract" in found ? found.contract.clientAgencyId : null;
    const agency = await getCurrentAgency();
    const party = Boolean(agency && (agency.id === ownerId || agency.id === buyerId));
    const staff = can(user.role, "escrow.resolve");
    if (!found || (!party && !staff)) return new NextResponse("Not found", { status: 404 });
    if (staff && !party) await audit(user.id, `${kind}.pdf_view`, kind, ref);
  } else {
    found = kind === "contract" ? await getContractByToken(ref) : await getNdaByToken(ref);
    if (!found) return new NextResponse("Not found", { status: 404 });
  }

  const doc =
    "contract" in found
      ? contractDocument({ ...found, addedMilestoneIds: new Set(found.changes.map((c) => c.milestoneId).filter((x): x is string => Boolean(x))) }, lang)
      : ndaDocument(found.nda, found.agency, lang);
  const pdf = await renderLegalPdf(doc);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${doc.number}-${lang}.pdf"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
      "referrer-policy": "no-referrer",
    },
  });
}
