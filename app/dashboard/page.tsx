import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CashflowChart from "@/components/dashboard/cashflow-chart";
import RecentTransactions, {
  type RecentTransaction,
} from "@/components/dashboard/recent-transactions";
import YearSelect from "@/components/dashboard/year-select";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTransactions } from "@/data/getTransactions";
import {
  buildMonthlyCashflow,
  calculateCashflowTotals,
  getCanonicalDashboardHref,
  getYearOptions,
  parseAmount,
  resolveYear,
} from "@/lib/dashboard";

const RECENT_TRANSACTIONS_LIMIT = 5;

type DashboardPageProps = {
  searchParams: Promise<{ year?: string | string[] }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { userId } = await auth.protect();
  const { year: yearParam } = await searchParams;

  const currentYear = new Date().getFullYear();

  // Redirect before any data is loaded when the year in the URL is not in its canonical form.
  const canonicalHref = getCanonicalDashboardHref(yearParam, currentYear);
  if (canonicalHref !== null) {
    redirect(canonicalHref);
  }

  // A repeated query param (?year=2024&year=2025) arrives as an array; use the first value.
  const rawYear = Array.isArray(yearParam) ? yearParam[0] : yearParam;
  const selectedYear = resolveYear(rawYear, currentYear);

  const transactions = await getTransactions(userId, selectedYear);
  const monthlyCashflow = buildMonthlyCashflow(transactions);
  const totals = calculateCashflowTotals(transactions);
  const yearOptions = getYearOptions(currentYear, selectedYear);

  const recentTransactions: RecentTransaction[] = transactions
    .slice(0, RECENT_TRANSACTIONS_LIMIT)
    .map((transaction) => ({
      id: transaction.id,
      description: transaction.description,
      transactionDate: transaction.transactionDate,
      categoryName: transaction.categoryName,
      categoryType: transaction.categoryType,
      amount: parseAmount(transaction.amount),
    }));

  return (
    <main className="flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Cashflow</CardTitle>
          <CardAction>
            <YearSelect years={yearOptions} selectedYear={selectedYear} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <CashflowChart
            year={selectedYear}
            data={monthlyCashflow}
            totals={totals}
          />
        </CardContent>
      </Card>

      <RecentTransactions year={selectedYear} transactions={recentTransactions} />
    </main>
  );
}
