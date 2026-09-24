import "server-only";
import { serviceLabel } from "@/lib/labels";
import { extractNeed, isArabic } from "../fallback";
import { runTool, type ToolState } from "../tools";
import { emptyUsage, type ChatMessage, type ProviderResult } from "../types";

// AI_PROVIDER=mock: a scripted stand-in for the model. It reads the need with
// the keyword rules, then drives the same tools a real model would
// (search_agencies → price_guide → recommend_agencies), with JSON arguments,
// validation and the "only recommend searched agencies" guard. Free, offline
// and deterministic, for development, demos and tests.
export async function mockMatchmaker(history: ChatMessage[], locale: string): Promise<ProviderResult> {
  const usage = emptyUsage();
  const userText = history.filter((m) => m.role === "user").map((m) => m.content).join(" \n ");
  const last = history.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const ar = last ? isArabic(last) : locale === "ar";
  const need = extractNeed(userText);
  const state: ToolState = { seen: new Map(), recommendation: null };
  const call = async (name: string, args: unknown) => {
    usage.calls++;
    const result = await runTool(name, JSON.parse(JSON.stringify(args)), state);
    if (result.isError) throw new Error(`mock tool error in ${name}: ${result.content}`);
    return JSON.parse(result.content.startsWith("{") ? result.content : "{}") as Record<string, unknown>;
  };

  if (!need.services.length) {
    return {
      model: "mock",
      usage,
      response: {
        mode: "ai",
        provider: "mock",
        recommendation: null,
        reply: ar ? "[تجريبي] ما الخدمة التي تحتاجها بالضبط؟ وفي أي مدينة، وما ميزانيتك الشهرية تقريباً؟" : "[mock] Which service do you need exactly? And which city and rough monthly budget?",
        suggestions: [],
      },
    };
  }

  const search = await call("search_agencies", { services: need.services, city: need.city, budget_max_jod: need.budget, platforms: need.platforms, industry: need.industry });
  const found = (search.agencies as { handle: string }[] | undefined) ?? [];
  if (!found.length) {
    return {
      model: "mock",
      usage,
      response: { mode: "ai", provider: "mock", recommendation: null, suggestions: [], reply: ar ? "[تجريبي] لم أجد وكالات مطابقة. جرّب مدينة أخرى." : "[mock] No matching agencies. Try another city." },
    };
  }
  const prices = await call("price_guide", { service: need.services[0], city: null });
  const range = prices.suggested as { min: number; max: number } | null;
  const budgetMin = need.budget ? Math.min(need.budget, range?.min ?? need.budget) : range?.min ?? null;
  const budgetMax = need.budget ?? range?.max ?? null;
  const names = need.services.map((s) => serviceLabel(s, ar ? "ar" : "en")).join(ar ? "، " : ", ");

  await call("recommend_agencies", {
    handles: found.slice(0, 3).map((a) => a.handle),
    services: need.services,
    city: need.city,
    platforms: need.platforms,
    budget_min_jod: budgetMin,
    budget_max_jod: budgetMax,
    budget_note: ar ? "[تجريبي] تقدير من أسعار الوكالات على سوّق." : "[mock] Estimate from agency prices on Sawwiq.",
    summary: (ar ? `[تجريبي] مطلوب: ${names}. ${last}` : `[mock] Needed: ${names}. ${last}`).slice(0, 1500),
  });

  return {
    model: "mock",
    usage,
    response: {
      mode: "ai",
      provider: "mock",
      recommendation: state.recommendation,
      suggestions: [],
      reply: ar ? `[تجريبي] هذه أفضل ${Math.min(3, found.length)} وكالات لـ ${names}.` : `[mock] Here are the top ${Math.min(3, found.length)} agencies for ${names}.`,
    },
  };
}
