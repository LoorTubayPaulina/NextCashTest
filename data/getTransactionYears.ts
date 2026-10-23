import { db } from "@/db";
import { transactionsTable } from "@/db/schema";
import "server-only";
import { desc, eq, sql } from "drizzle-orm";

// Returns the distinct calendar years in which the user has transactions, newest first.
export async function getTransactionYears(userId: string): Promise<number[]> {
  const yearExpression = sql<string>`to_char(${transactionsTable.transactionDate}, 'YYYY')`;

  const rows = await db
    .selectDistinct({ year: yearExpression })
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(yearExpression));

  return rows.map((row) => Number(row.year));
}
