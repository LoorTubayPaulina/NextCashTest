import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { transactionsTable } from "@/db/schema";
import { mockDb, rejectingQuery, resolvingQuery } from "@/tests/mocks/db";
import { getTransactionYears } from "@/data/getTransactionYears";

vi.mock("@/db", () => ({
  db: mockDb,
}));

const SELECT_DISTINCT_METHODS = ["from", "where", "orderBy"] as const;

const dialect = new PgDialect();

// Returns the chain created by db.selectDistinct() for the current test.
function selectDistinctChain() {
  return mockDb.selectDistinct.mock.results[0]?.value;
}

describe("getTransactionYears", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.selectDistinct.mockReturnValue(resolvingQuery([], SELECT_DISTINCT_METHODS));
  });

  it("returns an empty list when the user has no transactions", async () => {
    await expect(getTransactionYears("user_123")).resolves.toEqual([]);
  });

  it("converts the year strings returned by the database into numbers", async () => {
    mockDb.selectDistinct.mockReturnValue(
      resolvingQuery([{ year: "2025" }, { year: "2024" }], SELECT_DISTINCT_METHODS),
    );

    const years = await getTransactionYears("user_123");

    expect(years).toEqual([2025, 2024]);
    expect(years.every((year) => typeof year === "number")).toBe(true);
  });

  it("keeps the order the database returns, which is newest first", async () => {
    mockDb.selectDistinct.mockReturnValue(
      resolvingQuery([{ year: "2026" }, { year: "2023" }, { year: "2019" }], SELECT_DISTINCT_METHODS),
    );

    await expect(getTransactionYears("user_123")).resolves.toEqual([2026, 2023, 2019]);
  });

  it("selects a year derived from the transaction date from the transactions table", async () => {
    await getTransactionYears("user_123");

    const chain = selectDistinctChain();
    expect(chain.from).toHaveBeenCalledWith(transactionsTable);

    const [selection] = mockDb.selectDistinct.mock.calls[0] ?? [];
    const { sql } = dialect.sqlToQuery(selection.year);
    expect(sql).toContain('to_char("transactions"."transaction_date"');
    expect(sql).toContain("'YYYY'");
  });

  it("filters by the given userId", async () => {
    await getTransactionYears("user_123");

    const chain = selectDistinctChain();
    const { sql, params } = dialect.sqlToQuery(chain.where.mock.calls[0]?.[0]);
    expect(sql).toContain('"user_id"');
    expect(params).toEqual(["user_123"]);
  });

  it("does not use the userId of another user", async () => {
    await getTransactionYears("user_999");

    const chain = selectDistinctChain();
    const { params } = dialect.sqlToQuery(chain.where.mock.calls[0]?.[0]);
    expect(params).toContain("user_999");
    expect(params).not.toContain("user_123");
  });

  it("orders the years descending", async () => {
    await getTransactionYears("user_123");

    const chain = selectDistinctChain();
    expect(chain.orderBy).toHaveBeenCalledTimes(1);

    const { sql } = dialect.sqlToQuery(chain.orderBy.mock.calls[0]?.[0]);
    expect(sql).toMatch(/ desc$/i);
    expect(sql).toContain("to_char");
  });

  it("propagates database errors to the caller", async () => {
    mockDb.selectDistinct.mockReturnValue(
      rejectingQuery(new Error("db down"), SELECT_DISTINCT_METHODS),
    );

    await expect(getTransactionYears("user_123")).rejects.toThrow("db down");
  });
});
