import { db } from "@/db";
import { categoriesTable, transactionsTable } from "@/db/schema";
import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { CategoryType } from "@/lib/dashboard";

type GetAllTransactionsFilters = {
  type?: CategoryType;
  year?: number;
};

// Returns the user's transactions, newest first, joined with their category.
// Optional filters narrow the result by category type and calendar year.
export async function getAllTransactions(
  userId: string,
  filters: GetAllTransactionsFilters = {},
) {
  const transactions = await db
    .select({
      id: transactionsTable.id,
      description: transactionsTable.description,
      amount: transactionsTable.amount,
      transactionDate: transactionsTable.transactionDate,
      categoryName: categoriesTable.name,
      categoryType: categoriesTable.type,
    })
    .from(transactionsTable)
    .innerJoin(
      categoriesTable,
      eq(transactionsTable.categoryId, categoriesTable.id),
    )
    .where(
      and(
        eq(transactionsTable.userId, userId),
        filters.type ? eq(categoriesTable.type, filters.type) : undefined,
        filters.year !== undefined
          ? gte(transactionsTable.transactionDate, `${filters.year}-01-01`)
          : undefined,
        filters.year !== undefined
          ? lte(transactionsTable.transactionDate, `${filters.year}-12-31`)
          : undefined,
      ),
    )
    // id breaks ties between transactions on the same day, so the order is stable.
    .orderBy(
      desc(transactionsTable.transactionDate),
      desc(transactionsTable.id),
    );

  return transactions;
}
