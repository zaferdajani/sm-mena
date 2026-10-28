import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { composeReport, HELP_TOPICS, matchTopics } from "@/lib/help/topics";

describe("help chat topics", () => {
  it("finds the right answer in Arabic and English", () => {
    expect(matchTopics("كيف أضيف مشروعاً جديداً؟")[0].id).toBe("addProject");
    expect(matchTopics("نسيت كلمة المرور")[0].id).toBe("password");
    expect(matchTopics("How do I change my logo?")[0].id).toBe("profile");
    expect(matchTopics("where are the prices for packages")[0].id).toBe("packages");
    expect(matchTopics("asdfgh")).toEqual([]);
  });

  it("every topic has a title and an answer in both languages", () => {
    for (const t of HELP_TOPICS) {
      for (const m of [ar, en]) {
        const topic = (m.Help.topics as Record<string, { title: string; answer: string }>)[t.id];
        expect(topic?.title, `${t.id}`).toBeTruthy();
        expect(topic?.answer, `${t.id}`).toBeTruthy();
      }
      expect(t.link.startsWith("/")).toBe(true);
    }
  });

  it("writes one report from the chat's answers", () => {
    expect(composeReport({ kind: "bug", what: "زر الحفظ لا يعمل", steps: "عدّلت النبذة", expected: "" })).toBe(
      "زر الحفظ لا يعمل\n\nSteps: عدّلت النبذة\n\n(sent from the help chat)",
    );
  });
});

import { richHelpText } from "@/lib/help/topics";

describe("help replies as display parts", () => {
  it("turns in-site paths into topic links and keeps the words around them", () => {
    const parts = richHelpText("من الاستوديو افتح «منشور جديد» (/studio/new)، ثم اضغط «نشر».");
    expect(parts).toEqual([{ text: "من الاستوديو افتح «منشور جديد» " }, { href: "/studio/new", topic: "addProject" }, { text: "، ثم اضغط «نشر»." }]);
  });

  it("links a path without a topic by its path, strips a locale prefix", () => {
    expect(richHelpText("See /ar/studio/inbox now")).toContainEqual({ href: "/studio/inbox", topic: null });
  });

  it("keeps bold, drops list and heading marks, and leaves URLs and dates alone", () => {
    const parts = richHelpText("## Steps\n- open **Studio**\n- visit https://sawwiq.org/x on 1/2");
    expect(parts).toContainEqual({ bold: "Studio" });
    const flat = parts.map((p) => ("text" in p ? p.text : "")).join("");
    expect(flat).toContain("• open ");
    expect(flat).toContain("https://sawwiq.org/x");
    expect(flat).not.toContain("##");
    expect(parts.some((p) => "href" in p)).toBe(false);
  });
});
