import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { categoriesTable, transactionsTable } from "@/db/schema";
import { mockDb, resolvingQuery } from "@/tests/mocks/db";
import { getAllTransactions } from "@/data/getAllTransactions";

vi.mock("@/db", () => ({
  db: mockDb,
}));

const SELECT_METHODS = ["from", "innerJoin", "where", "orderBy"] as const;

const dialect = new PgDialect();

// Returns the SQL text and bound parameters of the WHERE clause passed to .where().
function compileWhereClause(): { sql: string; params: unknown[] } {
  const chain = mockDb.select.mock.results[0]?.value;
  const whereArgument = chain.where.mock.calls[0]?.[0];

  return dialect.sqlToQuery(whereArgument);
}

describe("getAllTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue(resolvingQuery([], SELECT_METHODS));
  });

  it("returns the rows produced by the query", async () => {
    const rows = [
      {
        id: 7,
        description: "Rent",
        amount: "850.00",
        transactionDate: "2024-02-01",
        categoryName: "Housing",
        categoryType: "expense",
      },
    ];
    mockDb.select.mockReturnValue(resolvingQuery(rows, SELECT_METHODS));

    await expect(getAllTransactions("user_123")).resolves.toEqual(rows);
  });

  it("reads from the transactions table joined to the categories table", async () => {
    await getAllTransactions("user_123");

    const chain = mockDb.select.mock.results[0]?.value;
    expect(chain.from).toHaveBeenCalledWith(transactionsTable);
    expect(chain.innerJoin).toHaveBeenCalledWith(categoriesTable, expect.anything());
  });

  describe("without filters", () => {
    it("filters only by the userId", async () => {
      await getAllTransactions("user_123");

      const { sql, params } = compileWhereClause();
      expect(sql).toContain('"user_id"');
      expect(params).toEqual(["user_123"]);
    });

    it("does not add a category type condition", async () => {
      await getAllTransactions("user_123", {});

      const { sql } = compileWhereClause();
      expect(sql).not.toContain('"categories"."type"');
    });

    it("does not add a date range condition", async () => {
      await getAllTransactions("user_123");

      const { sql } = compileWhereClause();
      expect(sql).not.toContain('"transaction_date"');
    });
  });

  describe("with a type filter only", () => {
    it("adds a condition on the category type", async () => {
      await getAllTransactions("user_123", { type: "expense" });

      const { sql, params } = compileWhereClause();
      expect(sql).toContain('"categories"."type"');
      expect(params).toContain("expense");
    });

    it("does not add a date range condition", async () => {
      await getAllTransactions("user_123", { type: "income" });

      const { sql, params } = compileWhereClause();
      expect(sql).not.toContain('"transaction_date"');
      expect(params).not.toContain("2025-01-01");
    });

    it("still filters by the userId", async () => {
      await getAllTransactions("user_123", { type: "income" });

      const { params } = compileWhereClause();
      expect(params).toContain("user_123");
    });
  });

  describe("with a year filter only", () => {
    it("limits the results to the start and end of the year", async () => {
      await getAllTransactions("user_123", { year: 2025 });

      const { sql, params } = compileWhereClause();
      expect(sql).toContain('"transaction_date" >=');
      expect(sql).toContain('"transaction_date" <=');
      expect(params).toEqual(
        expect.arrayContaining(["2025-01-01", "2025-12-31"]),
      );
    });

    it("does not add a category type condition", async () => {
      await getAllTransactions("user_123", { year: 2025 });

      const { sql } = compileWhereClause();
      expect(sql).not.toContain('"categories"."type"');
    });

    it("uses the year passed in for the date boundaries", async () => {
      await getAllTransactions("user_123", { year: 2019 });

      const { params } = compileWhereClause();
      expect(params).toEqual(expect.arrayContaining(["2019-01-01", "2019-12-31"]));
      expect(params).not.toContain("2025-01-01");
    });
  });

  describe("with both type and year filters", () => {
    it("applies the category type condition and the year range together", async () => {
      await getAllTransactions("user_123", { type: "income", year: 2024 });

      const { sql, params } = compileWhereClause();
      expect(sql).toContain('"categories"."type"');
      expect(sql).toContain('"transaction_date" >=');
      expect(sql).toContain('"transaction_date" <=');
      expect(params).toEqual(
        expect.arrayContaining(["user_123", "income", "2024-01-01", "2024-12-31"]),
      );
    });
  });

  describe("ordering", () => {
    it("orders by date descending, then by id descending as a tie breaker", async () => {
      await getAllTransactions("user_123");

      const chain = mockDb.select.mock.results[0]?.value;
      expect(chain.orderBy).toHaveBeenCalledTimes(1);

      const [dateOrder, idOrder] = chain.orderBy.mock.calls[0] ?? [];
      expect(dialect.sqlToQuery(dateOrder).sql).toMatch(/"transaction_date" desc/i);
      expect(dialect.sqlToQuery(idOrder).sql).toMatch(/"id" desc/i);
    });
  });
});
