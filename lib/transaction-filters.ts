// Pure transaction list filter logic: no database or server-only imports, so it can be
// shared by server components and client components alike.

import { z } from "zod";
import {
  isAcceptedYear,
  YEAR_PATTERN,
  type CategoryType,
} from "@/lib/dashboard";

export const TRANSACTIONS_PATH = "/dashboard/transaction";

const typeFilterSchema = z.enum(["all", "income", "expense"]).catch("all");

// Accepts "all" or a 4-digit year within the accepted range; anything else falls back to "all".
function createYearFilterSchema(currentYear: number) {
  return z
    .string()
    .refine(
      (value) =>
        value === "all" ||
        (YEAR_PATTERN.test(value) && isAcceptedYear(Number(value), currentYear)),
    )
    .transform((value): number | "all" =>
      value === "all" ? "all" : Number(value),
    )
    .catch("all");
}

export type TypeFilter = z.infer<typeof typeFilterSchema>;
export type YearFilter = number | "all";

export type TransactionFilters = {
  type: "all" | CategoryType;
  year: YearFilter;
};

export type TransactionFilterParams = {
  type?: string | string[];
  year?: string | string[];
};

// A repeated query param (?year=2024&year=2025) arrives as an array; use the first value.
function firstParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseTransactionFilters(
  params: TransactionFilterParams,
  currentYear: number,
): TransactionFilters {
  const type = typeFilterSchema.parse(firstParamValue(params.type));
  const year = createYearFilterSchema(currentYear).parse(
    firstParamValue(params.year),
  );

  return { type, year };
}

// Builds the list URL for the given filters, leaving out defaults (type=all, year=all).
export function buildTransactionFiltersHref(
  current: TransactionFilters,
  changes: Partial<TransactionFilters>,
): string {
  const next = { ...current, ...changes };
  const params = new URLSearchParams();

  if (next.type !== "all") {
    params.set("type", next.type);
  }

  if (next.year !== "all") {
    params.set("year", String(next.year));
  }

  const query = params.toString();
  return query ? `${TRANSACTIONS_PATH}?${query}` : TRANSACTIONS_PATH;
}

// Years with data within the accepted range, plus the selected year when it is not among them,
// newest first. Out-of-range years are left out because parseTransactionFilters would reject them.
export function getTransactionYearOptions(
  dataYears: number[],
  selectedYear: YearFilter,
  currentYear: number,
): number[] {
  const years = new Set<number>(
    dataYears.filter((year) => isAcceptedYear(year, currentYear)),
  );

  if (selectedYear !== "all") {
    years.add(selectedYear);
  }

  return [...years].sort((a, b) => b - a);
}
