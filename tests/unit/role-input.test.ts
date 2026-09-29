import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import catalog from "@/data/service-catalog.json";
import { roleLabel } from "@/lib/services/catalog";
import { cleanRoleTitle, customRoleKey, exactRole, keepSeoAcronym, MAX_SELECTED_ROLES, normalizeRoleSelection, normalizeRoleText, roleIdentity, searchRoles } from "@/lib/services/role-input";

describe("role vocabulary and duplicate prevention", () => {
  it("keeps SEO in English in every shipped UI language and catalog generation", () => {
    for (const locale of ["ar", "en"]) expect(roleLabel("seo_specialist", locale)).toContain("SEO");
    expect(catalog.roles.find((r) => r.key === "seo_specialist")?.name_ar).toBe("مختص SEO");
    for (const role of catalog.roles) expect(role.name_ar).not.toMatch(/سيو/);
    for (const service of catalog.services.filter((s) => /(^|_)seo($|_)/.test(s.key))) {
      expect(service.name_ar).toContain("SEO");
      expect(service.name_ar).not.toMatch(/السيو|تحسين محركات البحث/);
    }
    const generator = readFileSync("scripts/gen-service-catalog.py", "utf8");
    expect(generator).toContain('("seo_specialist", "مختص SEO", "SEO specialist")');
    expect(generator).not.toContain('"مختص سيو", "SEO specialist"');
    expect(keepSeoAcronym("أسيوط")).toBe("أسيوط");
    expect(keepSeoAcronym("سيو للمطاعم")).toBe("SEO للمطاعم");
  });
  it("reuses bilingual names, aliases, case, punctuation, Unicode widths and diacritics", () => {
    for (const text of ["SEO", "seo", "ＳＥＯ", "S.E.O.", "SEO Specialist", "سيو", "مختص سيو", "مختص SEO", "مُخْتَصّ SEO", "تحسين محركات البحث"]) {
      expect(exactRole(text), text).toBe("seo_specialist");
      expect(customRoleKey(text), text).toBe("seo_specialist");
    }
    expect(exactRole("designer graphic")).toBe("graphic_designer");
    expect(exactRole("مصور فُوتوغرافي")).toBe("photographer");
  });
  it("searches every catalog role, not just the initial ten", () => {
    expect(searchRoles("drone", "ar").map((r) => r.key)).toContain("drone_operator");
    expect(searchRoles("3D", "en").map((r) => r.key)).toContain("3d_artist");
    expect(searchRoles("مصمم", "ar").length).toBeGreaterThan(1);
    expect(searchRoles("سيو", "ar")[0]).toEqual({ key: "seo_specialist", label: "مختص SEO" });
  });
  it("offers partial matches without collapsing genuinely different specialties", () => {
    expect(searchRoles("SEO for restaurants", "en").map((r) => r.key)).toContain("seo_specialist");
    expect(exactRole("SEO for restaurants")).toBeNull();
    expect(customRoleKey("SEO for restaurants")).toBe("custom:SEO for restaurants");
    expect(searchRoles("مصمم جرافيك طبي", "ar").map((r) => r.key)).toContain("graphic_designer");
  });
  it("deduplicates server-side, preserves readable spelling and is idempotent", () => {
    const selected = normalizeRoleSelection(["seo_specialist", "SEO", "custom:مختص سيو", "drone_operator", "custom:طَيّار تصوير متخصص", "custom:طيار تصوير متخصص", "custom:Wedding Stylist", "custom:wedding   stylist", "not_a_real_role"]);
    expect(selected).toEqual(["seo_specialist", "drone_operator", "custom:طَيّار تصوير متخصص", "custom:Wedding Stylist"]);
    expect(normalizeRoleSelection(selected)).toEqual(selected);
    expect(roleLabel(selected[2], "ar")).toBe("طَيّار تصوير متخصص");
    expect(roleLabel(selected[3], "en")).toBe("Wedding Stylist");
    expect(roleIdentity("custom:Wedding Stylist")).toBe(roleIdentity("custom:wedding stylist"));
    expect(normalizeRoleText("أَخصّائي")).toBe("اخصائي");
  });
  it("never leaks or globally registers another provider's personal titles", () => {
    const mine = "custom:Healthcare set stylist";
    expect(searchRoles("Healthcare set stylist", "en", [mine]).map((r) => r.key)).toContain(mine);
    expect(searchRoles("Healthcare set stylist", "en")).toEqual([]);
  });
  it("rejects malformed, oversized, control-character and link payloads", () => {
    for (const text of ["", " ", "a", "123", "a".repeat(65), "<script>alert(1)</script>", "https://example.com", "SEO\u202eBAD", "Role\nTitle", "user@test.com"]) expect(cleanRoleTitle(text), text).toBeNull();
    expect(normalizeRoleSelection(["custom:<img src=x>", "custom:", "admin", "../../secret"])).toEqual([]);
    expect(normalizeRoleSelection(Array.from({ length: 90 }, (_, i) => `custom:Role title ${i}`))).toHaveLength(MAX_SELECTED_ROLES);
  });
});
