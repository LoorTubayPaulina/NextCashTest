import { vi, type Mock } from "vitest";

// Chainable stand-in for a Drizzle query builder. Every method returns the same
// chain, and awaiting the chain settles with the outcome passed in, so both
// `await db.select().from(table)` and `await db.insert(table).values(row)` work.
export type QueryChain = Record<string, Mock>;

export function createQueryChain(
  settle: () => Promise<unknown>,
  methodNames: readonly string[],
): QueryChain {
  const chain: QueryChain = {};

  for (const name of methodNames) {
    chain[name] = vi.fn(() => chain);
  }

  chain.then = vi.fn(
    (onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      settle().then(onFulfilled, onRejected),
  );

  return chain;
}

// Resolves the chain with rows, like a successful query.
export function resolvingQuery(rows: unknown[], methodNames: readonly string[]): QueryChain {
  return createQueryChain(() => Promise.resolve(rows), methodNames);
}

// Rejects the chain, like a failed query (for example a dropped connection).
export function rejectingQuery(error: unknown, methodNames: readonly string[]): QueryChain {
  return createQueryChain(() => Promise.reject(error), methodNames);
}

// Shared mock object used through vi.mock("@/db") in test files.
export const mockDb = {
  select: vi.fn(),
  selectDistinct: vi.fn(),
  insert: vi.fn(),
};
