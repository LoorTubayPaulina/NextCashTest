import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, type CategoryType } from "@/lib/dashboard";

export type TransactionRow = {
  id: number;
  description: string;
  transactionDate: string; // yyyy-mm-dd
  categoryName: string;
  categoryType: CategoryType;
  amount: number;
};

type TransactionsTableProps = {
  caption: string;
  rows: TransactionRow[];
  emptyMessage: string;
};

const TYPE_LABELS: Record<CategoryType, string> = {
  income: "Income",
  expense: "Expense",
};

// Badge colors use the darker text tokens from app/globals.css for WCAG AA contrast.
const TYPE_BADGE_CLASSES: Record<CategoryType, string> = {
  income: "bg-income-badge text-income-text",
  expense: "bg-expense-badge text-expense-text",
};

export default function TransactionsTable({
  caption,
  rows,
  emptyMessage,
}: TransactionsTableProps) {
  return (
    <Table>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {format(parseISO(transaction.transactionDate), "do MMM yyyy")}
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>
                <Badge className={TYPE_BADGE_CLASSES[transaction.categoryType]}>
                  {TYPE_LABELS[transaction.categoryType]}
                </Badge>
              </TableCell>
              <TableCell>{transaction.categoryName}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(transaction.amount)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
