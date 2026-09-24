import "./setup-db";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/lib/db";
import { storage } from "@/lib/storage";
import { addBackground, dayIn, listBackgrounds, pickBackground, removeBackground, setBackgroundEnabled, type Background } from "@/lib/theme/backgrounds";

afterAll(() => closeDb());

const bg = (over: Partial<Background>): Background => ({
  id: crypto.randomUUID(),
  label: "x",
  scope: "all",
  kind: "image",
  mediaKey: "backgrounds/x.webp",
  startsOn: null,
  endsOn: null,
  veil: 60,
  enabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("which background a country's interface shows", () => {
  const everywhere = bg({ label: "Brand", scope: "all" });
  const saudi = bg({ label: "Saudi default", scope: "sa" });
  const flagDay = bg({ label: "Flag Day", scope: "sa", startsOn: "2027-03-10", endsOn: "2027-03-12" });
  const ramadan = bg({ label: "Ramadan", scope: "all", startsOn: "2027-02-08", endsOn: "2027-03-09" });
  const list = [everywhere, saudi, flagDay, ramadan];

  it("prefers a dated background for the country, then the country's own, then all countries", () => {
    expect(pickBackground(list, "sa", "2027-03-11")?.label).toBe("Flag Day");
    expect(pickBackground(list, "sa", "2027-03-13")?.label).toBe("Saudi default");
    expect(pickBackground(list, "jo", "2027-03-11")?.label).toBe("Brand");
    expect(pickBackground(list, "jo", "2027-02-20")?.label).toBe("Ramadan");
    expect(pickBackground(list, "sa", "2027-02-20")?.label).toBe("Ramadan");
  });

  it("ignores switched-off backgrounds and returns nothing when none apply", () => {
    expect(pickBackground([{ ...flagDay, enabled: false }], "sa", "2027-03-11")).toBeNull();
    expect(pickBackground([saudi], "eg", "2027-03-11")).toBeNull();
  });

  it("uses each country's own calendar day", () => {
    const utcLateEvening = new Date("2027-03-10T22:30:00Z");
    expect(dayIn("Asia/Riyadh", utcLateEvening)).toBe("2027-03-11");
    expect(dayIn("Africa/Cairo", utcLateEvening)).toBe("2027-03-11");
    expect(dayIn("UTC", utcLateEvening)).toBe("2027-03-10");
  });
});

describe("stored backgrounds", () => {
  it("adds, switches off and deletes a background with its file", async () => {
    const added = await addBackground({ label: "Flag Day", scope: "sa", kind: "image", startsOn: "2027-03-10", endsOn: "2027-03-12", veil: 40, enabled: true }, { body: Buffer.from("fake"), ext: "webp", contentType: "image/webp" }, null);
    expect(await storage().get(added.mediaKey)).not.toBeNull();
    expect((await listBackgrounds()).map((b) => b.label)).toEqual(["Flag Day"]);
    await setBackgroundEnabled(added.id, false, null);
    expect((await listBackgrounds())[0].enabled).toBe(false);
    await removeBackground(added.id, null);
    expect(await listBackgrounds()).toEqual([]);
    expect(await storage().get(added.mediaKey)).toBeNull();
  });
});
