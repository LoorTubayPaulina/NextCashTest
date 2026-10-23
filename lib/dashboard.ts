// Pure dashboard logic: no database or server-only imports, so it can be
// shared by server components and client components alike.

export type CategoryType = "income" | "expense";

// Shape of a transaction row needed for the dashboard calculations.
// `amount` is a string because Drizzle returns `numeric` columns as strings.
export type DashboardTransaction = {
  transactionDate: string; // yyyy-mm-dd
  amount: string;
  categoryType: CategoryType;
};

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type MonthLabel = (typeof MONTH_LABELS)[number];

export type MonthlyCashflow = {
  month: MonthLabel;
  income: number;
  expenses: number;
};

export type CashflowTotals = {
  income: number;
  expenses: number;
  balance: number;
};

export const YEAR_PATTERN = /^\d{4}$/;
const MIN_VALID_YEAR = 2000;
const FUTURE_YEARS_ALLOWED = 1; // next year is accepted, nothing further ahead
const YEARS_BEFORE_CURRENT = 4;
const TICK_COUNT = 5; // 0 plus four steps
const DEFAULT_TICK_STEP = 1500;
const NICE_MULTIPLIERS = [1, 1.5, 2, 2.5, 5] as const;

const CURRENCY_OPTIONS = { style: "currency", currency: "GBP" } as const;

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  ...CURRENCY_OPTIONS,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Only for chart axis ticks, where whole pounds keep the labels short.
const axisCurrencyFormatter = new Intl.NumberFormat("en-GB", {
  ...CURRENCY_OPTIONS,
  maximumFractionDigits: 0,
});

export function parseAmount(amount: string): number {
  const value = Number(amount);
  return Number.isFinite(value) ? value : 0;
}

// Converts an amount to integer pence so that sums are exact.
function toCents(amount: string): number {
  return Math.round(parseAmount(amount) * 100);
}

// Converts integer pence back to pounds. Only used at the end of a calculation.
function centsToPounds(cents: number): number {
  return cents / 100;
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatAxisCurrency(value: number): string {
  return axisCurrencyFormatter.format(value);
}

// A year is accepted from MIN_VALID_YEAR up to the current year plus one.
export function isAcceptedYear(year: number, currentYear: number): boolean {
  return year >= MIN_VALID_YEAR && year <= currentYear + FUTURE_YEARS_ALLOWED;
}

// Returns the year from the URL, or the current year when it is not a valid, accepted 4-digit year.
export function resolveYear(value: string | undefined, currentYear: number): number {
  if (value === undefined || !YEAR_PATTERN.test(value)) {
    return currentYear;
  }

  const year = Number(value);
  return isAcceptedYear(year, currentYear) ? year : currentYear;
}

// Current year plus previous years, always including the selected year, newest first.
export function getYearOptions(currentYear: number, selectedYear: number): number[] {
  const years = new Set<number>([selectedYear]);

  for (let offset = 0; offset <= YEARS_BEFORE_CURRENT; offset++) {
    years.add(currentYear - offset);
  }

  return [...years]
    .filter((year) => isAcceptedYear(year, currentYear))
    .sort((a, b) => b - a);
}

function getMonthIndex(transactionDate: string): number {
  // yyyy-mm-dd: the month is always at positions 5-6, so no Date parsing (and no timezone shift) is needed.
  return Number(transactionDate.slice(5, 7)) - 1;
}

// Builds 12 monthly points (Jan..Dec) with income and expense sums.
export function buildMonthlyCashflow(transactions: DashboardTransaction[]): MonthlyCashflow[] {
  const months = MONTH_LABELS.map((month) => ({
    month,
    incomeCents: 0,
    expenseCents: 0,
  }));

  for (const transaction of transactions) {
    const monthly = months[getMonthIndex(transaction.transactionDate)];
    if (!monthly) {
      continue;
    }

    const cents = toCents(transaction.amount);
    if (transaction.categoryType === "income") {
      monthly.incomeCents += cents;
    } else {
      monthly.expenseCents += cents;
    }
  }

  return months.map((monthly) => ({
    month: monthly.month,
    income: centsToPounds(monthly.incomeCents),
    expenses: centsToPounds(monthly.expenseCents),
  }));
}

export function calculateCashflowTotals(transactions: DashboardTransaction[]): CashflowTotals {
  let incomeCents = 0;
  let expenseCents = 0;

  for (const transaction of transactions) {
    const cents = toCents(transaction.amount);
    if (transaction.categoryType === "income") {
      incomeCents += cents;
    } else {
      expenseCents += cents;
    }
  }

  return {
    income: centsToPounds(incomeCents),
    expenses: centsToPounds(expenseCents),
    balance: centsToPounds(incomeCents - expenseCents),
  };
}

// Smallest "nice" step (1, 1.5, 2, 2.5, 5 times a power of ten) that is >= minStep.
function getNiceStep(minStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(minStep));
  const step = NICE_MULTIPLIERS.map((multiplier) => multiplier * magnitude).find(
    (candidate) => candidate >= minStep,
  );

  // The largest multiplier is 5, so the next power of ten always fits.
  return step ?? magnitude * 10;
}

// Y-axis ticks from 0 up to the top tick, which is at least maxValue.
export function getYAxisTicks(maxValue: number): number[] {
  const step =
    maxValue > 0 ? getNiceStep(maxValue / (TICK_COUNT - 1)) : DEFAULT_TICK_STEP;

  return Array.from({ length: TICK_COUNT }, (_, index) => index * step);
}
