// Scores AI providers on the test conversations in tests/fixtures/matchmaker-cases.ts.
//
//   npm run ai:eval                         every configured provider (mock + basic when none)
//   npm run ai:eval -- --provider openai,anthropic
//   npm run ai:eval -- --provider openai --price-in 0.10 --price-out 0.50   (USD per million tokens)
//   npm run ai:eval -- --case en-injection --verbose
//
// Runs against a throwaway in-memory database seeded with the demo agencies, so
// it never touches real data. Real providers cost real tokens: ~30 conversations.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.PGLITE_DIR = "memory://";
process.env.UPLOADS_DIR = mkdtempSync(path.join(tmpdir(), "sawwiq-eval-"));
process.env.MONETIZATION_ENABLED = "false";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

async function main() {
  const { seed } = await import("../lib/db/seed");
  const { closeDb } = await import("../lib/db");
  const { providerChain, runProvider } = await import("../lib/ai/agent");
  const { basicMatchmaker } = await import("../lib/ai/fallback");
  const { scoreCase } = await import("../lib/ai/eval");
  const { MATCH_CASES } = await import("../tests/fixtures/matchmaker-cases");
  type Runner = (turns: import("../lib/ai/types").ChatMessage[]) => Promise<import("../lib/ai/types").ProviderResult>;

  const requested = arg("provider")?.split(",").map((p) => p.trim());
  const providers = requested ?? (providerChain().length ? providerChain() : ["mock", "basic"]);
  const cases = arg("case") ? MATCH_CASES.filter((c) => c.id === arg("case")) : MATCH_CASES;
  const priceIn = Number(arg("price-in") ?? NaN);
  const priceOut = Number(arg("price-out") ?? NaN);
  const verbose = process.argv.includes("--verbose");

  console.log(`Seeding demo agencies… (${cases.length} cases, providers: ${providers.join(", ")})`);
  await seed({ quiet: true });

  for (const provider of providers) {
    const run: Runner =
      provider === "basic"
        ? async (turns) => ({ model: "rules", usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, calls: 0 }, response: await basicMatchmaker(turns, "en") })
        : (turns) => runProvider(provider as "anthropic" | "openai" | "mock", turns, "en");
    let passed = 0;
    let model = "";
    const totals = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, ms: 0, errors: 0 };
    const byLang: Record<string, [number, number]> = {};
    console.log(`\n=== ${provider} ===`);
    for (const c of cases) {
      const started = Date.now();
      let line: string;
      let ok = false;
      try {
        const result = await run(c.turns);
        model = result.model;
        totals.ms += Date.now() - started;
        totals.inputTokens += result.usage.inputTokens;
        totals.cachedInputTokens += result.usage.cachedInputTokens;
        totals.outputTokens += result.usage.outputTokens;
        const checks = scoreCase(c.expect, c.turns.at(-1)!.content, result.response);
        ok = checks.every((ch) => ch.ok);
        line = checks.filter((ch) => verbose || !ch.ok).map((ch) => `${ch.ok ? "✓" : "✗"} ${ch.name}${ch.detail ? ` (${ch.detail})` : ""}`).join("  ");
        if (verbose) line += `\n      reply: ${result.response.reply.slice(0, 160).replace(/\n/g, " ")}`;
      } catch (error) {
        totals.errors++;
        line = `error: ${(error as Error).message}`;
      }
      if (ok) passed++;
      const [p, n] = byLang[c.lang] ?? [0, 0];
      byLang[c.lang] = [p + (ok ? 1 : 0), n + 1];
      console.log(`${ok ? "PASS" : "FAIL"}  ${c.id}${line ? `  ${line}` : ""}`);
    }
    const n = cases.length;
    console.log(`\n${provider} (${model}): ${passed}/${n} passed (${Math.round((passed / n) * 100)}%), ${totals.errors} errors`);
    console.log(`  by language: ${Object.entries(byLang).map(([l, [p, t]]) => `${l} ${p}/${t}`).join(", ")}`);
    if (totals.inputTokens || totals.outputTokens) {
      const avgIn = Math.round(totals.inputTokens / n);
      const avgOut = Math.round(totals.outputTokens / n);
      console.log(`  tokens per conversation: ${avgIn} in (${Math.round((totals.cachedInputTokens / Math.max(1, totals.inputTokens)) * 100)}% cached), ${avgOut} out; avg ${Math.round(totals.ms / n)} ms`);
      if (Number.isFinite(priceIn) && Number.isFinite(priceOut)) {
        const per = (avgIn * priceIn + avgOut * priceOut) / 1_000_000;
        console.log(`  est. cost: $${per.toFixed(5)} per conversation, $${(per * 500).toFixed(2)} per 500 (cache discounts not applied)`);
      }
    }
  }
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
