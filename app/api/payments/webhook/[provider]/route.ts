import { applyProviderEvent } from "@/lib/data/payments";
import { paymentProvider } from "@/lib/payments/provider";

// Payment provider notifications. Signature-checked by the provider adapter,
// stored once per provider event id, amount must match the payment.
export async function POST(request: Request, ctx: RouteContext<"/api/payments/webhook/[provider]">) {
  const { provider: name } = await ctx.params;
  const provider = paymentProvider();
  if (provider.id !== name) return new Response("unknown provider", { status: 404 });
  const raw = await request.text();
  const event = provider.parseWebhook(raw, request.headers);
  if (!event) return new Response("bad signature", { status: 401 });
  const result = await applyProviderEvent(provider.id, event);
  return Response.json({ result });
}
