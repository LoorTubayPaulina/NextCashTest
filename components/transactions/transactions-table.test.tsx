// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import TransactionsTable, {
  type TransactionRow,
} from "@/components/transactions/transactions-table";

afterEach(() => {
  cleanup();
});

const CAPTION = "All transactions";
const EMPTY_MESSAGE = "No transactions match these filters";

const ROWS: TransactionRow[] = [
  {
    id: 1,
    description: "March pay",
    transactionDate: "2025-03-01",
    categoryName: "Salary",
    categoryType: "income",
    amount: 1234.5,
  },
  {
    id: 2,
    description: "Weekly shop",
    transactionDate: "2025-03-22",
    categoryName: "Groceries",
    categoryType: "expense",
    amount: 56.2,
  },
];

function renderTable(rows: TransactionRow[] = ROWS) {
  render(<TransactionsTable caption={CAPTION} rows={rows} emptyMessage={EMPTY_MESSAGE} />);
  return screen.getByRole("table", { name: CAPTION });
}

function rowFor(description: string): HTMLElement {
  const row = screen.getByText(description).closest("tr");

  if (!row) {
    throw new Error(`No table row found for "${description}"`);
  }

  return row;
}

describe("TransactionsTable", () => {
  describe("caption and headers", () => {
    it("names the table with the caption text", () => {
      renderTable();

      expect(screen.getByRole("table", { name: CAPTION })).toBeInTheDocument();
    });

    it("renders the column headers in order", () => {
      const table = renderTable();

      const headers = within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent);
      expect(headers).toEqual(["Date", "Description", "Type", "Category", "Amount"]);
    });
  });

  describe("with transactions", () => {
    it("renders one data row per transaction after the header", () => {
      const table = renderTable();

      expect(within(table).getAllByRole("row")).toHaveLength(3);
      expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument();
    });

    it("shows the date as a day with an ordinal suffix, short month and year", () => {
      renderTable();

      expect(within(rowFor("March pay")).getByText("1st Mar 2025")).toBeInTheDocument();
      expect(within(rowFor("Weekly shop")).getByText("22nd Mar 2025")).toBeInTheDocument();
    });

    it("shows the description and category name in their rows", () => {
      renderTable();

      expect(within(rowFor("March pay")).getByText("Salary")).toBeInTheDocument();
      expect(within(rowFor("Weekly shop")).getByText("Groceries")).toBeInTheDocument();
    });

    it("labels income rows with the Income badge text and expense rows with Expense", () => {
      renderTable();

      expect(within(rowFor("March pay")).getByText("Income")).toBeInTheDocument();
      expect(within(rowFor("Weekly shop")).getByText("Expense")).toBeInTheDocument();
    });

    it("formats each amount as pounds with two decimals and a thousands separator", () => {
      renderTable();

      expect(within(rowFor("March pay")).getByText("£1,234.50")).toBeInTheDocument();
      expect(within(rowFor("Weekly shop")).getByText("£56.20")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows the empty message in a single full-width row", () => {
      const table = renderTable([]);

      expect(screen.getByText(EMPTY_MESSAGE)).toBeInTheDocument();
      const dataRows = within(table).getAllByRole("row").slice(1);
      expect(dataRows).toHaveLength(1);
      expect(within(dataRows[0]!).getByRole("cell")).toHaveAttribute("colspan", "5");
    });

    it("does not render any transaction data when there are no rows", () => {
      renderTable([]);

      expect(screen.queryByText("£0.00")).not.toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Income" })).not.toBeInTheDocument();
    });
  });
});
