import { beforeEach, describe, expect, it, vi } from "vitest";

// A scripted stand-in for Claude reading a portfolio.
const created: unknown[] = [];
let reply: unknown = null;
vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    messages = {
      create: async (req: unknown) => {
        created.push(req);
        return reply;
      },
    };
  }
  return { default: Anthropic };
});

const { classifyPage, clientOf, planFromText } = await import("@/lib/portfolio-import/rules");
const { planWithAi } = await import("@/lib/portfolio-import/ai");
const { analyzePortfolio } = await import("@/lib/portfolio-import");

const pages = [
  { index: 0, text: "Nakhla Studio\nPortfolio 2026" },
  { index: 1, text: "Rose Café launch\nClient: Rose Café\nInstagram management and reels for a café in Amman.\nOrders +40% in two months." },
  { index: 2, text: "" },
  { index: 3, text: "Petra Motors\nMeta ads campaign for a car dealer" },
  { index: 4, text: "Our clients\nRose Café\nPetra Motors\nZaytoon Market" },
  { index: 5, text: "Contact us\ninfo@nakhla.jo\n+962 79 000 0000" },
];

describe("reading a portfolio from its text", () => {
  it("recognises covers, client lists and contact pages", () => {
    expect(classifyPage(pages[0], pages.length)).toBe("cover");
    expect(classifyPage(pages[1], pages.length)).toBe("work");
    expect(classifyPage(pages[4], pages.length)).toBe("clients");
    expect(classifyPage(pages[5], pages.length)).toBe("contact");
    expect(clientOf("Client: Rose Café")).toBe("Rose Café");
    expect(clientOf("العميل: مقهى الياسمين")).toBe("مقهى الياسمين");
  });

  it("groups a project's pages (picture-only pages join the project before) and finds services and clients", () => {
    const plan = planFromText(pages, "jo", ["smm_content"]);
    expect(plan.mode).toBe("basic");
    expect(plan.drafts.map((d) => d.pages)).toEqual([[1, 2], [3]]);
    expect(plan.drafts[0]).toMatchObject({ title: "Rose Café launch", client: "Rose Café" });
    expect(plan.drafts[0].services).toContain("smm_management");
    expect(plan.drafts[0].platforms).toContain("instagram");
    expect(plan.drafts[1].services).toContain("ads_meta");
    expect(plan.profile.clients.map((c) => c.name)).toEqual(["Rose Café", "Petra Motors", "Zaytoon Market"]);
  });

  it("tags a page whose text names no service with the agency's own service", () => {
    const plan = planFromText([{ index: 0, text: "Summer campaign" }, { index: 1, text: "Autumn lookbook" }], "jo", ["photography"]);
    expect(plan.drafts.every((d) => d.services[0] === "photography")).toBe(true);
  });
});

describe("reading a portfolio with the AI", () => {
  beforeEach(() => {
    created.length = 0;
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("sends every page's text and image, forces the tool, and keeps only valid, non-overlapping values", async () => {
    reply = {
      content: [
        {
          type: "tool_use",
          id: "t1",
          name: "portfolio_plan",
          input: {
            pages: [{ index: 0, kind: "cover" }, { index: 1, kind: "work" }, { index: 2, kind: "work" }, { index: 99, kind: "work" }],
            projects: [
              { pages: [1, 2, 99], title: "Rose Café launch", client: "Rose Café", caption: "Launch content for Rose Café.", services: ["smm_management", "not_a_service"], platforms: ["instagram", "myspace"], industry: "restaurant_cafe", result: "+40% orders" },
              { pages: [2], title: "Duplicate", client: null, caption: "x", services: ["seo"], platforms: [], industry: null, result: null },
            ],
            profile: { about: "We make content for restaurants.", strengths: ["Reels in 48 hours"], clients: [{ name: "Rose Café", industry: "restaurant_cafe" }, { name: "x", industry: null }] },
          },
        },
      ],
    };
    const plan = await planWithAi(
      [
        { index: 0, text: "Cover", image: "data:image/jpeg;base64,AAAA" },
        { index: 1, text: "Rose Café", image: "data:image/jpeg;base64,BBBB" },
        { index: 2, text: "", image: null },
      ],
      { name: "Nakhla", services: ["smm_management"] },
      "en",
    );
    const req = created[0] as { tool_choice: { name: string }; messages: { content: { type: string }[] }[] };
    expect(req.tool_choice.name).toBe("portfolio_plan");
    expect(req.messages[0].content.filter((b) => b.type === "image")).toHaveLength(2);
    expect(plan.mode).toBe("ai");
    expect(plan.drafts).toHaveLength(1); // the duplicate's only page was already used
    expect(plan.drafts[0]).toMatchObject({ pages: [1, 2], services: ["smm_management"], platforms: ["instagram"], client: "Rose Café", result: "+40% orders" });
    expect(plan.kinds[0]).toBe("cover");
    expect(plan.profile.clients.map((c) => c.name)).toEqual(["Rose Café"]);
  });

  it("falls back to the text rules when the AI fails", async () => {
    reply = { content: [{ type: "text", text: "sorry" }] };
    const plan = await analyzePortfolio(pages, { name: "Nakhla", services: ["smm_content"], country: "jo" }, "en");
    expect(plan.mode).toBe("basic");
    expect(plan.drafts.length).toBe(2);
    delete process.env.ANTHROPIC_API_KEY;
  });
});
