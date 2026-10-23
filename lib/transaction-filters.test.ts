import { describe, expect, it } from "vitest";
import {
  buildTransactionFiltersHref,
  getCanonicalTransactionFiltersHref,
  getTransactionYearOptions,
  parseTransactionFilters,
} from "@/lib/transaction-filters";

const CURRENT_YEAR = 2026;

describe("parseTransactionFilters", () => {
  describe("defaults", () => {
    it("returns type all and year all when no params are provided", () => {
      expect(parseTransactionFilters({}, CURRENT_YEAR)).toEqual({ type: "all", year: "all" });
    });

    it("returns the defaults when the params are explicitly undefined", () => {
      expect(
        parseTransactionFilters({ type: undefined, year: undefined }, CURRENT_YEAR),
      ).toEqual({ type: "all", year: "all" });
    });
  });

  describe("type param", () => {
    it.each([
      ["income", "income"],
      ["expense", "expense"],
      ["all", "all"],
    ])("accepts type %j", (value, expected) => {
      expect(parseTransactionFilters({ type: value }, CURRENT_YEAR).type).toBe(expected);
    });

    it.each(["salary", "", "INCOME", "Expense", "income "])(
      "falls back to all for invalid type %j",
      (value) => {
        expect(() => parseTransactionFilters({ type: value }, CURRENT_YEAR)).not.toThrow();
        expect(parseTransactionFilters({ type: value }, CURRENT_YEAR).type).toBe("all");
      },
    );

    it("uses the first value when the type param is repeated", () => {
      expect(
        parseTransactionFilters({ type: ["expense", "income"] }, CURRENT_YEAR).type,
      ).toBe("expense");
    });

    it("falls back to all when the repeated type param is an empty array", () => {
      expect(parseTransactionFilters({ type: [] }, CURRENT_YEAR).type).toBe("all");
    });

    it("falls back to all when the first repeated type value is invalid", () => {
      expect(
        parseTransactionFilters({ type: ["bogus", "income"] }, CURRENT_YEAR).type,
      ).toBe("all");
    });
  });

  describe("year param", () => {
    it("returns the year as a number when it is a valid year", () => {
      expect(parseTransactionFilters({ year: "2025" }, CURRENT_YEAR).year).toBe(2025);
    });

    it("returns all when the year is all", () => {
      expect(parseTransactionFilters({ year: "all" }, CURRENT_YEAR).year).toBe("all");
    });

    it("accepts 2000, the first accepted year", () => {
      expect(parseTransactionFilters({ year: "2000" }, CURRENT_YEAR).year).toBe(2000);
    });

    it("accepts the next year as the maximum future year", () => {
      expect(parseTransactionFilters({ year: "2027" }, CURRENT_YEAR).year).toBe(2027);
    });

    it.each(["1999", "2099", "2028", "0000"])(
      "falls back to all for a year outside the accepted range %j",
      (value) => {
        expect(parseTransactionFilters({ year: value }, CURRENT_YEAR).year).toBe("all");
      },
    );

    it.each(["abc", "202", "20255", "2025.0", " 2025", "", "abcd"])(
      "falls back to all for malformed year %j",
      (value) => {
        expect(() => parseTransactionFilters({ year: value }, CURRENT_YEAR)).not.toThrow();
        expect(parseTransactionFilters({ year: value }, CURRENT_YEAR).year).toBe("all");
      },
    );

    it("uses the first value when the year param is repeated", () => {
      expect(
        parseTransactionFilters({ year: ["2024", "2025"] }, CURRENT_YEAR).year,
      ).toBe(2024);
    });

    it("falls back to all when the repeated year param is an empty array", () => {
      expect(parseTransactionFilters({ year: [] }, CURRENT_YEAR).year).toBe("all");
    });

    it("validates the year against the currentYear it is given", () => {
      expect(parseTransactionFilters({ year: "2030" }, 2029).year).toBe(2030);
      expect(parseTransactionFilters({ year: "2030" }, CURRENT_YEAR).year).toBe("all");
    });
  });

  it("parses type and year together", () => {
    expect(
      parseTransactionFilters({ type: "expense", year: "2024" }, CURRENT_YEAR),
    ).toEqual({ type: "expense", year: 2024 });
  });

  it("falls back independently: a valid type is kept when the year is invalid", () => {
    expect(
      parseTransactionFilters({ type: "income", year: "1999" }, CURRENT_YEAR),
    ).toEqual({ type: "income", year: "all" });
  });
});

describe("buildTransactionFiltersHref", () => {
  const defaults = { type: "all", year: "all" } as const;

  it("returns the bare list path when both filters are defaults", () => {
    expect(buildTransactionFiltersHref(defaults, {})).toBe("/dashboard/transaction");
  });

  it("omits type when it is all", () => {
    expect(buildTransactionFiltersHref(defaults, { type: "all" })).toBe(
      "/dashboard/transaction",
    );
  });

  it("omits year when it is all", () => {
    expect(buildTransactionFiltersHref(defaults, { year: "all" })).toBe(
      "/dashboard/transaction",
    );
  });

  it("includes only the type when only the type is set", () => {
    expect(buildTransactionFiltersHref(defaults, { type: "expense" })).toBe(
      "/dashboard/transaction?type=expense",
    );
  });

  it("includes only the year when only the year is set", () => {
    expect(buildTransactionFiltersHref(defaults, { year: 2025 })).toBe(
      "/dashboard/transaction?year=2025",
    );
  });

  it("includes both params when both are set", () => {
    expect(buildTransactionFiltersHref(defaults, { type: "income", year: 2024 })).toBe(
      "/dashboard/transaction?type=income&year=2024",
    );
  });

  it("keeps the current filters that are not changed", () => {
    expect(
      buildTransactionFiltersHref({ type: "income", year: 2024 }, { year: "all" }),
    ).toBe("/dashboard/transaction?type=income");
  });

  it("resets the type to the default while keeping the year", () => {
    expect(
      buildTransactionFiltersHref({ type: "expense", year: 2023 }, { type: "all" }),
    ).toBe("/dashboard/transaction?year=2023");
  });

  it("returns the bare list path when every filter is reset to default", () => {
    expect(
      buildTransactionFiltersHref({ type: "expense", year: 2023 }, { type: "all", year: "all" }),
    ).toBe("/dashboard/transaction");
  });
});

describe("getCanonicalTransactionFiltersHref", () => {
  it.each([
    [{ year: "1999" }, "/dashboard/transaction"],
    [{ type: "bogus", year: "2024" }, "/dashboard/transaction?year=2024"],
    [{ year: ["2024", "2025"] }, "/dashboard/transaction?year=2024"],
    [{ year: "" }, "/dashboard/transaction"],
    [{ type: ["income", "expense"] }, "/dashboard/transaction?type=income"],
    [{ type: "" }, "/dashboard/transaction"],
    [{ type: "income", year: "1999" }, "/dashboard/transaction?type=income"],
    [{ type: "expense", year: "2028" }, "/dashboard/transaction?type=expense"],
  ])("redirects non-canonical params %j to %s", (params, expected) => {
    expect(getCanonicalTransactionFiltersHref(params, CURRENT_YEAR)).toBe(expected);
  });

  it.each([
    [{ type: "all" }],
    [{ year: "all" }],
    [{ type: "all", year: "all" }],
    [{ foo: "1" } as Record<string, string>],
    [{}],
    [{ year: "2024" }],
    [{ type: "income", year: "2024" }],
    [{ type: "expense", year: "2027" }],
  ])("does not redirect canonical params %j", (params) => {
    expect(getCanonicalTransactionFiltersHref(params, CURRENT_YEAR)).toBeNull();
  });

  it("ignores unknown params alongside valid filters", () => {
    const unknownParams: Record<string, string> = { type: "income", foo: "1" };

    expect(getCanonicalTransactionFiltersHref(unknownParams, CURRENT_YEAR)).toBeNull();
  });

  it("validates the year against the currentYear it is given", () => {
    expect(getCanonicalTransactionFiltersHref({ year: "2030" }, 2029)).toBeNull();
    expect(getCanonicalTransactionFiltersHref({ year: "2030" }, CURRENT_YEAR)).toBe(
      "/dashboard/transaction",
    );
  });

  it.each([
    [{ year: "1999" }],
    [{ type: "bogus", year: "2024" }],
    [{ year: ["2024", "2025"] }],
    [{ year: "" }],
    [{ type: ["income", "expense"] }],
    [{ type: "income", year: "1999" }],
  ])("is idempotent: the redirect target for %j is canonical", (params) => {
    const href = getCanonicalTransactionFiltersHref(params, CURRENT_YEAR);
    expect(href).not.toBeNull();

    const query = href?.split("?")[1] ?? "";
    const canonicalParams = Object.fromEntries(new URLSearchParams(query));

    expect(getCanonicalTransactionFiltersHref(canonicalParams, CURRENT_YEAR)).toBeNull();
  });
});

describe("getTransactionYearOptions", () => {
  it("returns the years with data, newest first", () => {
    expect(getTransactionYearOptions([2023, 2025, 2024], "all", CURRENT_YEAR)).toEqual([2025, 2024, 2023]);
  });

  it("returns an empty list when there is no data and no year is selected", () => {
    expect(getTransactionYearOptions([], "all", CURRENT_YEAR)).toEqual([]);
  });

  it("includes the selected year even when it has no data", () => {
    expect(getTransactionYearOptions([2025, 2023], 2019, CURRENT_YEAR)).toEqual([2025, 2023, 2019]);
  });

  it("includes the selected year when there is no data at all", () => {
    expect(getTransactionYearOptions([], 2024, CURRENT_YEAR)).toEqual([2024]);
  });

  it("does not repeat the selected year when it already has data", () => {
    expect(getTransactionYearOptions([2025, 2024], 2024, CURRENT_YEAR)).toEqual([2025, 2024]);
  });

  it("places a selected future year first, in newest-first order", () => {
    expect(getTransactionYearOptions([2025], 2027, CURRENT_YEAR)).toEqual([2027, 2025]);
  });

  it("leaves out years before 2000 in the data", () => {
    expect(getTransactionYearOptions([1990, 2025], "all", CURRENT_YEAR)).toEqual([2025]);
  });

  it("leaves out years beyond currentYear + 1 in the data", () => {
    expect(getTransactionYearOptions([2028, 2025], "all", CURRENT_YEAR)).toEqual([2025]);
  });

  it("keeps in-range years from the data, sorted newest first", () => {
    expect(getTransactionYearOptions([2000, 2027, 2024, 2025], "all", CURRENT_YEAR)).toEqual([
      2027, 2025, 2024, 2000,
    ]);
  });

  it("includes an in-range selected year with no data", () => {
    expect(getTransactionYearOptions([2025], 2010, CURRENT_YEAR)).toEqual([2025, 2010]);
  });

  it("offers only years that parseTransactionFilters accepts", () => {
    const options = getTransactionYearOptions([1990, 2000, 2025, 2028], "all", CURRENT_YEAR);

    for (const option of options) {
      expect(
        parseTransactionFilters({ year: String(option) }, CURRENT_YEAR).year,
      ).toBe(option);
    }
  });
});
