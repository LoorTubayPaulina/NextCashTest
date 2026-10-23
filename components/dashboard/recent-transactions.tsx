import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TransactionsTable, {
  type TransactionRow,
} from "@/components/transactions/transactions-table";

export type RecentTransaction = TransactionRow;

type RecentTransactionsProps = {
  year: number;
  transactions: RecentTransaction[];
};

export default function RecentTransactions({
  year,
  transactions,
}: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Recent Transactions</CardTitle>
        <CardAction className="flex gap-2">
          <Link
            href="/dashboard/transaction"
            className={buttonVariants({ variant: "outline" })}
          >
            View All
          </Link>
          <Link
            href="/dashboard/transaction/new"
            className={buttonVariants({ variant: "default" })}
          >
            Create New
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <TransactionsTable
          caption={`Recent transactions for ${year}`}
          rows={transactions}
          emptyMessage={`No transactions for ${year}`}
        />
      </CardContent>
    </Card>
  );
}
