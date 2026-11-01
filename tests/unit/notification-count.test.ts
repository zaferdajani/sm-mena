import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNotificationCount } from "@/lib/notification-count";

afterEach(() => vi.unstubAllGlobals());

describe("notification count requests", () => {
  it("shares concurrent requests but fetches fresh data after completion", async () => {
    const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify({ count: 3 })));
    vi.stubGlobal("fetch", transport);
    const first = fetchNotificationCount();
    const second = fetchNotificationCount();
    expect(first).toBe(second);
    expect(await first).toBe(3);
    expect(transport).toHaveBeenCalledTimes(1);
    transport.mockResolvedValue(new Response(JSON.stringify({ count: 0 })));
    expect(await fetchNotificationCount()).toBe(0);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls[0][1]).toMatchObject({ cache: "no-store", signal: expect.any(AbortSignal) });
  });

  it("allows retrying after a failed request", async () => {
    const transport = vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 1 })));
    vi.stubGlobal("fetch", transport);
    await expect(fetchNotificationCount()).rejects.toThrow("offline");
    expect(await fetchNotificationCount()).toBe(1);
  });

  it("leaves the current count intact on HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    expect(await fetchNotificationCount()).toBeNull();
  });
});
