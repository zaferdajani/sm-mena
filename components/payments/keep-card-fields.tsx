"use client";

import { useEffect } from "react";

const KEY = "sw:test-card";
const FIELDS = ["holder", "card", "expiry", "cvc"] as const;

/**
 * Keeps what was typed into the sandbox card form across a declined attempt, so the next try needs
 * only the change (QA L-10). Only the published test card numbers are kept: anything else typed into
 * the card field (which could be a real card) is never stored, and neither is its CVC.
 */
export function KeepCardFields({ formId, testCards }: { formId: string; testCards: string[] }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Partial<Record<(typeof FIELDS)[number], string>> | null;
      for (const name of FIELDS) {
        const input = form.elements.namedItem(name) as HTMLInputElement | null;
        if (input && !input.value && saved?.[name]) input.value = saved[name]!;
      }
    } catch {}
    const onSubmit = () => {
      const data = new FormData(form);
      const card = String(data.get("card") ?? "").replace(/\D/g, "");
      const isTest = testCards.includes(card);
      const keep = { holder: String(data.get("holder") ?? ""), expiry: String(data.get("expiry") ?? ""), ...(isTest ? { card: String(data.get("card") ?? ""), cvc: String(data.get("cvc") ?? "") } : {}) };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(keep));
      } catch {}
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [formId, testCards]);
  return null;
}
