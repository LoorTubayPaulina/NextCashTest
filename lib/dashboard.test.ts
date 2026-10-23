import { describe, expect, it } from "vitest";
import {
  buildMonthlyCashflow,
  calculateCashflowTotals,
  DASHBOARD_PATH,
  formatCurrency,
  getCanonicalDashboardHref,
  getYAxisTicks,
  getYearOptions,
  parseAmount,
  parseYearParam,
  resolveYear,
  type DashboardTransaction,
} from "@/lib/dashboard";

const CURRENT_YEAR = 2026;

describe("resolveYear", () => {
  it("returns the requested year when it is a valid 4-digit year in range", () => {
    expect(resolveYear("2024", CURRENT_YEAR)).toBe(2024);
  });

  it("accepts the next year as the maximum future year", () => {
    expect(resolveYear("2027", CURRENT_YEAR)).toBe(2027);
  });

  it("falls back to the current year when no year is provided", () => {
    expect(resolveYear(undefined, CURRENT_YEAR)).toBe(CURRENT_YEAR);
  });

  it("falls back to the current year when the year is before 2000", () => {
    expect(resolveYear("1999", CURRENT_YEAR)).toBe(CURRENT_YEAR);
  });

  it("falls back to the current year when the year is more than one year ahead", () => {
    expect(resolveYear("2028", CURRENT_YEAR)).toBe(CURRENT_YEAR);
  });

  it.each(["202", "20255", "20a5", "2025.0", " 2025", "", "abcd"])(
    "falls back to the current year for malformed value %j",
    (value) => {
      expect(resolveYear(value, CURRENT_YEAR)).toBe(CURRENT_YEAR);
    },
  );
});

describe("parseYearParam", () => {
  it("returns the year as a number when it is a valid accepted year", () => {
    expect(parseYearParam("2024", CURRENT_YEAR)).toBe(2024);
  });

  it("accepts 2000 and the next year as the range boundaries", () => {
    expect(parseYearParam("2000", CURRENT_YEAR)).toBe(2000);
    expect(parseYearParam("2027", CURRENT_YEAR)).toBe(2027);
  });

  it("returns null when no value is provided", () => {
    expect(parseYearParam(undefined, CURRENT_YEAR)).toBeNull();
  });

  it.each(["1999", "2028"])("returns null for a year outside the accepted range %j", (value) => {
    expect(parseYearParam(value, CURRENT_YEAR)).toBeNull();
  });

  it.each(["202", "20255", "20a5", "2025.0", " 2025", "", "abcd"])(
    "returns null for malformed value %j",
    (value) => {
      expect(parseYearParam(value, CURRENT_YEAR)).toBeNull();
    },
  );
});

describe("getCanonicalDashboardHref", () => {
  it("returns null when there is no year param", () => {
    expect(getCanonicalDashboardHref(undefined, CURRENT_YEAR)).toBeNull();
  });

  it("returns null when the year param is already canonical", () => {
    expect(getCanonicalDashboardHref("2024", CURRENT_YEAR)).toBeNull();
    expect(getCanonicalDashboardHref("2027", CURRENT_YEAR)).toBeNull();
  });

  it("redirects an out-of-range year to the bare dashboard path", () => {
    expect(getCanonicalDashboardHref("1999", CURRENT_YEAR)).toBe(DASHBOARD_PATH);
    expect(getCanonicalDashboardHref("2028", CURRENT_YEAR)).toBe(DASHBOARD_PATH);
  });

  it.each(["", "abcd", "202", "2025.0", " 2025", "2025 "])(
    "redirects malformed year %j to the bare dashboard path",
    (value) => {
      expect(getCanonicalDashboardHref(value, CURRENT_YEAR)).toBe(DASHBOARD_PATH);
    },
  );

  it("uses the first value of a repeated valid year", () => {
    expect(getCanonicalDashboardHref(["2024", "2025"], CURRENT_YEAR)).toBe(
      "/dashboard?year=2024",
    );
  });

  it("redirects a repeated year to the bare dashboard path when the first value is invalid", () => {
    expect(getCanonicalDashboardHref(["1999", "2025"], CURRENT_YEAR)).toBe(DASHBOARD_PATH);
  });

  it("redirects an empty repeated year to the bare dashboard path", () => {
    expect(getCanonicalDashboardHref([], CURRENT_YEAR)).toBe(DASHBOARD_PATH);
  });

  it("is idempotent: the redirect target is canonical", () => {
    const href = getCanonicalDashboardHref(["2024", "2025"], CURRENT_YEAR);
    const search = href?.split("?")[1] ?? "";
    const year = new URLSearchParams(search).get("year") ?? undefined;

    expect(getCanonicalDashboardHref(year, CURRENT_YEAR)).toBeNull();
  });
});

describe("getYearOptions", () => {
  it("returns the current year and the four previous years, newest first", () => {
    expect(getYearOptions(CURRENT_YEAR, CURRENT_YEAR)).toEqual([
      2026, 2025, 2024, 2023, 2022,
    ]);
  });

  it("includes the selected year even when it is outside the default window", () => {
    expect(getYearOptions(CURRENT_YEAR, 2019)).toEqual([
      2026, 2025, 2024, 2023, 2022, 2019,
    ]);
  });

  it("includes the next year when it is the selected year", () => {
    expect(getYearOptions(CURRENT_YEAR, 2027)).toEqual([
      2027, 2026, 2025, 2024, 2023, 2022,
    ]);
  });

  it("does not repeat the selected year when it is already in the window", () => {
    const options = getYearOptions(CURRENT_YEAR, 2024);

    expect(options).toHaveLength(5);
    expect(new Set(options).size).toBe(options.length);
  });
});

describe("buildMonthlyCashflow", () => {
  it("returns 12 zeroed months from January to December when there are no transactions", () => {
    const result = buildMonthlyCashflow([]);

    expect(result).toHaveLength(12);
    expect(result.map((month) => month.month)).toEqual([
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]);
    expect(result.every((month) => month.income === 0 && month.expenses === 0)).toBe(true);
  });

  it("places a transaction in the month written in its yyyy-mm-dd date, without a timezone shift", () => {
    const result = buildMonthlyCashflow([
      { transactionDate: "2025-01-01", amount: "10", categoryType: "income" },
      { transactionDate: "2025-12-31", amount: "20", categoryType: "expense" },
    ]);

    expect(result[0]).toEqual({ month: "Jan", income: 10, expenses: 0 });
    expect(result[11]).toEqual({ month: "Dec", income: 0, expenses: 20 });
  });

  it("sums income and expenses separately within the same month", () => {
    const transactions: DashboardTransaction[] = [
      { transactionDate: "2025-03-05", amount: "100.25", categoryType: "income" },
      { transactionDate: "2025-03-20", amount: "40.10", categoryType: "income" },
      { transactionDate: "2025-03-21", amount: "15.50", categoryType: "expense" },
    ];

    const march = buildMonthlyCashflow(transactions)[2];

    expect(march).toEqual({ month: "Mar", income: 140.35, expenses: 15.5 });
  });

  it("keeps decimal sums exact (0.1 + 0.2 is 0.3)", () => {
    const transactions: DashboardTransaction[] = [
      { transactionDate: "2025-06-01", amount: "0.1", categoryType: "expense" },
      { transactionDate: "2025-06-02", amount: "0.2", categoryType: "expense" },
    ];

    expect(buildMonthlyCashflow(transactions)[5]?.expenses).toBe(0.3);
  });
});

describe("calculateCashflowTotals", () => {
  it("returns zero totals when there are no transactions", () => {
    expect(calculateCashflowTotals([])).toEqual({ income: 0, expenses: 0, balance: 0 });
  });

  it("sums income, expenses and balance across the whole list", () => {
    const totals = calculateCashflowTotals([
      { transactionDate: "2025-01-10", amount: "1000.00", categoryType: "income" },
      { transactionDate: "2025-02-10", amount: "300.10", categoryType: "expense" },
      { transactionDate: "2025-03-10", amount: "50.00", categoryType: "expense" },
    ]);

    expect(totals).toEqual({ income: 1000, expenses: 350.1, balance: 649.9 });
  });

  it("returns an exact sum for amounts that are not exact in binary floating point", () => {
    const totals = calculateCashflowTotals([
      { transactionDate: "2025-01-01", amount: "0.1", categoryType: "income" },
      { transactionDate: "2025-01-02", amount: "0.2", categoryType: "income" },
    ]);

    expect(totals.income).toBe(0.3);
    expect(totals.balance).toBe(0.3);
  });

  it("returns a negative balance when expenses exceed income", () => {
    const totals = calculateCashflowTotals([
      { transactionDate: "2025-01-01", amount: "10.00", categoryType: "income" },
      { transactionDate: "2025-01-02", amount: "25.50", categoryType: "expense" },
    ]);

    expect(totals.balance).toBe(-15.5);
  });
});

describe("getYAxisTicks", () => {
  it("uses a default 1500 step when the maximum value is zero", () => {
    expect(getYAxisTicks(0)).toEqual([0, 1500, 3000, 4500, 6000]);
  });

  it("uses a default 1500 step when the maximum value is negative", () => {
    expect(getYAxisTicks(-10)).toEqual([0, 1500, 3000, 4500, 6000]);
  });

  it("returns five ticks starting at zero with a nice step for a small maximum", () => {
    expect(getYAxisTicks(1000)).toEqual([0, 250, 500, 750, 1000]);
  });

  it("returns a top tick that is at least the maximum value", () => {
    for (const maxValue of [1, 7, 42.5, 999, 1234.56, 6000, 123456]) {
      const ticks = getYAxisTicks(maxValue);
      const topTick = ticks[ticks.length - 1] ?? 0;

      expect(ticks).toHaveLength(5);
      expect(ticks[0]).toBe(0);
      expect(topTick).toBeGreaterThanOrEqual(maxValue);
    }
  });

  it("returns strictly increasing ticks", () => {
    const ticks = getYAxisTicks(4800);

    ticks.slice(1).forEach((tick, index) => {
      expect(tick).toBeGreaterThan(ticks[index] ?? -Infinity);
    });
  });
});

describe("parseAmount", () => {
  it("parses a decimal string into a number", () => {
    expect(parseAmount("12.5")).toBe(12.5);
  });

  it("returns 0 for a non-numeric string", () => {
    expect(parseAmount("abc")).toBe(0);
  });

  it("returns 0 for an empty string", () => {
    expect(parseAmount("")).toBe(0);
  });

  it("returns 0 for values that are not finite numbers", () => {
    expect(parseAmount("Infinity")).toBe(0);
    expect(parseAmount("NaN")).toBe(0);
  });
});

describe("formatCurrency", () => {
  it("formats a value as pounds with two decimals and a thousands separator", () => {
    expect(formatCurrency(1234.5)).toBe("£1,234.50");
  });

  it("always shows two decimal places, including for whole amounts", () => {
    expect(formatCurrency(0)).toBe("£0.00");
  });

  it("rounds to two decimal places", () => {
    expect(formatCurrency(10.256)).toBe("£10.26");
  });

  it("places the minus sign before the currency symbol for negative values", () => {
    expect(formatCurrency(-5)).toBe("-£5.00");
  });
});
