import { afterEach, describe, expect, it, vi } from "vitest";
import { showComingSoon } from "@/lib/coming-soon";

describe("showComingSoon", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is hidden in production unless the flag opts in", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SHOW_COMING_SOON", "");
    expect(showComingSoon()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_SHOW_COMING_SOON", "true");
    expect(showComingSoon()).toBe(true);
  });

  it("is shown outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SHOW_COMING_SOON", "");
    expect(showComingSoon()).toBe(true);
  });
});
