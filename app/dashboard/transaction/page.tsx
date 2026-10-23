import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ChevronRightIcon } from "lucide-react";
import TransactionFilters from "@/components/transactions/transaction-filters";
import TransactionsTable, {
  type TransactionRow,
} from "@/components/transactions/transactions-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { getAllTransactions } from "@/data/getAllTransactions";
import { getTransactionYears } from "@/data/getTransactionYears";
import { parseAmount } from "@/lib/dashboard";
import {
  buildTransactionFiltersHref,
  getTransactionYearOptions,
  parseTransactionFilters,
} from "@/lib/transaction-filters";

type TransactionsPageProps = {
  searchParams: Promise<{ type?: string | string[]; year?: string | string[] }>;
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const { userId } = await auth.protect();

  const currentYear = new Date().getFullYear();
  const filters = parseTransactionFilters(await searchParams, currentYear);

  const [transactions, dataYears] = await Promise.all([
    getAllTransactions(userId, {
      type: filters.type === "all" ? undefined : filters.type,
      year: filters.year === "all" ? undefined : filters.year,
    }),
    getTransactionYears(userId),
  ]);

  const yearOptions = getTransactionYearOptions(dataYears, filters.year, currentYear);
  const hasAnyTransactions = dataYears.length > 0;
  const isFiltered = filters.type !== "all" || filters.year !== "all";

  const rows: TransactionRow[] = transactions.map((transaction) => ({
    id: transaction.id,
    description: transaction.description,
    transactionDate: transaction.transactionDate,
    categoryName: transaction.categoryName,
    categoryType: transaction.categoryType,
    amount: parseAmount(transaction.amount),
  }));

  return (
    <main className="flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRightIcon className="size-4" />
        <span className="text-foreground">Transactions</span>
      </nav>

      <h1 className="text-4xl font-semibold tracking-tight">Transactions</h1>

      <Card>
        <CardHeader>
          <CardAction className="flex flex-wrap items-center gap-2">
            <TransactionFilters
              type={filters.type}
              year={filters.year}
              years={yearOptions}
            />
            <Link
              href="/dashboard/transaction/new"
              className={buttonVariants({ variant: "default" })}
            >
              Create New
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {hasAnyTransactions ? (
            <>
              <TransactionsTable
                caption="All transactions"
                rows={rows}
                emptyMessage="No transactions match these filters"
              />
              {isFiltered && rows.length === 0 ? (
                <p className="text-center">
                  <Link
                    href={buildTransactionFiltersHref(filters, {
                      type: "all",
                      year: "all",
                    })}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Clear filters
                  </Link>
                </p>
              ) : null}
            </>
          ) : (
            <p className="py-6 text-center text-muted-foreground">
              You have no transactions yet.{" "}
              <Link
                href="/dashboard/transaction/new"
                className="text-primary underline-offset-4 hover:underline"
              >
                Create your first transaction
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
