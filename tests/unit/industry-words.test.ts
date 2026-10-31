import { describe, expect, it } from "vitest";
import { industryForWords } from "@/lib/industry-words";

describe("industryForWords", () => {
  it("reads everyday business words as a business type, in Arabic and English", () => {
    expect(industryForWords("مخبز")).toBe("restaurant_cafe");
    expect(industryForWords("حلويات")).toBe("restaurant_cafe");
    expect(industryForWords("Bakery")).toBe("restaurant_cafe");
    expect(industryForWords("عيادة أسنان")).toBe("clinic_health");
    expect(industryForWords("صالون")).toBe("beauty_fitness");
  });

  it("prefers a phrase over its first word, and leaves other searches alone", () => {
    expect(industryForWords("متجر إلكتروني")).toBe("ecommerce");
    expect(industryForWords("متجر")).toBe("retail_shop");
    expect(industryForWords("نخلة")).toBeNull();
    expect(industryForWords("")).toBeNull();
  });
});
