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
