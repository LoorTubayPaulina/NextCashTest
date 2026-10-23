// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransactionsPage from "@/app/dashboard/transaction/page";
import { getAllTransactions } from "@/data/getAllTransactions";
import { getTransactionYears } from "@/data/getTransactionYears";

const { protectMock, pushMock } = vi.hoisted(() => ({
  protectMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: protectMock },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/data/getAllTransactions", () => ({
  getAllTransactions: vi.fn(),
}));

vi.mock("@/data/getTransactionYears", () => ({
  getTransactionYears: vi.fn(),
}));

const USER_ID = "user_123";

const TRANSACTION_ROWS = [
  {
    id: 1,
    description: "March pay",
    amount: "1234.50",
    transactionDate: "2025-03-01",
    categoryName: "Salary",
    categoryType: "income" as const,
  },
  {
    id: 2,
    description: "Weekly shop",
    amount: "56.20",
    transactionDate: "2025-03-15",
    categoryName: "Groceries",
    categoryType: "expense" as const,
  },
];

// Renders the async server component by awaiting its returned element tree.
async function renderPage(searchParams: Record<string, string | string[]> = {}) {
  const element = await TransactionsPage({
    searchParams: Promise.resolve(searchParams),
  });
  render(element);
}

beforeEach(() => {
  vi.clearAllMocks();
  protectMock.mockResolvedValue({ userId: USER_ID });
  vi.mocked(getAllTransactions).mockResolvedValue([]);
  vi.mocked(getTransactionYears).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

describe("TransactionsPage", () => {
  describe("authentication and data loading", () => {
    it("queries the transactions of the authenticated user", async () => {
      await renderPage();

      expect(getAllTransactions).toHaveBeenCalledWith(USER_ID, {
        type: undefined,
        year: undefined,
      });
      expect(getTransactionYears).toHaveBeenCalledWith(USER_ID);
    });

    it("does not query any data when the user is not authenticated", async () => {
      protectMock.mockRejectedValue(new Error("Unauthorized"));

      await expect(
        TransactionsPage({ searchParams: Promise.resolve({}) }),
      ).rejects.toThrow("Unauthorized");
      expect(getAllTransactions).not.toHaveBeenCalled();
      expect(getTransactionYears).not.toHaveBeenCalled();
    });

    it("passes the type and year from the URL to the transactions query", async () => {
      await renderPage({ type: "expense", year: "2024" });

      expect(getAllTransactions).toHaveBeenCalledWith(USER_ID, {
        type: "expense",
        year: 2024,
      });
    });

    it("ignores an invalid type and year in the URL and queries without them", async () => {
      await renderPage({ type: "salary", year: "1999" });

      expect(getAllTransactions).toHaveBeenCalledWith(USER_ID, {
        type: undefined,
        year: undefined,
      });
    });
  });

  describe("with transactions", () => {
    it("renders the transactions returned by the query", async () => {
      vi.mocked(getAllTransactions).mockResolvedValue(TRANSACTION_ROWS);
      vi.mocked(getTransactionYears).mockResolvedValue([2025]);

      await renderPage();

      const table = screen.getByRole("table", { name: "All transactions" });
      expect(within(table).getAllByRole("row")).toHaveLength(3);
      expect(screen.getByText("March pay")).toBeInTheDocument();
      expect(screen.getByText("Weekly shop")).toBeInTheDocument();
    });

    it("offers the years that have data in the year filter", async () => {
      vi.mocked(getAllTransactions).mockResolvedValue(TRANSACTION_ROWS);
      vi.mocked(getTransactionYears).mockResolvedValue([2025, 2023]);

      await renderPage();

      await userEvent.setup().click(screen.getByRole("combobox", { name: "Filter by year" }));

      expect(await screen.findByRole("option", { name: "2025" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "2023" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "All years" })).toBeInTheDocument();
    });

    it("does not show the empty state or a clear filters link", async () => {
      vi.mocked(getAllTransactions).mockResolvedValue(TRANSACTION_ROWS);
      vi.mocked(getTransactionYears).mockResolvedValue([2025]);

      await renderPage({ type: "income" });

      expect(screen.queryByText("You have no transactions yet.")).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Clear filters" })).not.toBeInTheDocument();
    });
  });

  describe("without any transactions", () => {
    it("tells the user they have no transactions and links to create the first one", async () => {
      await renderPage();

      expect(screen.getByText(/You have no transactions yet\./)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Create your first transaction" }),
      ).toHaveAttribute("href", "/dashboard/transaction/new");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("when filters match nothing", () => {
    it("shows the no-match message in the table and a link that clears the filters", async () => {
      vi.mocked(getTransactionYears).mockResolvedValue([2025]);

      await renderPage({ type: "income", year: "2024" });

      expect(screen.getByText("No transactions match these filters")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
        "href",
        "/dashboard/transaction",
      );
    });

    it("does not show the clear filters link when no filter is active", async () => {
      vi.mocked(getTransactionYears).mockResolvedValue([2025]);

      await renderPage();

      expect(screen.getByText("No transactions match these filters")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Clear filters" })).not.toBeInTheDocument();
    });
  });

  describe("links", () => {
    it("links Create New to the new transaction form", async () => {
      vi.mocked(getTransactionYears).mockResolvedValue([2025]);

      await renderPage();

      expect(screen.getByRole("link", { name: "Create New" })).toHaveAttribute(
        "href",
        "/dashboard/transaction/new",
      );
    });
  });
});
