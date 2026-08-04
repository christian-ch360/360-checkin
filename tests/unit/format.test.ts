import { describe, it, expect } from "vitest";
import { formatCurrency, formatCompactCurrency, formatPercent, formatHours } from "@/lib/utils/format";

describe("format utils", () => {
  it("formats currency with no decimals by default", () => {
    expect(formatCurrency(1234)).toBe("$1,234");
  });

  it("formats currency with decimals when precise", () => {
    expect(formatCurrency(1234.5, { precise: true })).toBe("$1,234.50");
  });

  it("formats compact currency for large numbers", () => {
    expect(formatCompactCurrency(1_500_000)).toBe("$1.5M");
    expect(formatCompactCurrency(2_400)).toBe("$2.4K");
  });

  it("formats percentages with one decimal by default", () => {
    expect(formatPercent(12.3)).toBe("12.3%");
    expect(formatPercent(-4.5)).toBe("-4.5%");
  });

  it("formats hours with one decimal and an h suffix", () => {
    expect(formatHours(7.5)).toBe("7.5h");
  });
});
