// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransactionFilters from "@/components/transactions/transaction-filters";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  pushMock.mockReset();
});

const YEARS = [2025, 2024];

function renderFilters(props: { type: "all" | "income" | "expense"; year: number | "all" }) {
  render(<TransactionFilters {...props} years={YEARS} />);
  return { user: userEvent.setup() };
}

function typeTrigger(): HTMLElement {
  return screen.getByRole("combobox", { name: "Filter by type" });
}

function yearTrigger(): HTMLElement {
  return screen.getByRole("combobox", { name: "Filter by year" });
}

describe("TransactionFilters", () => {
  describe("current values", () => {
    it("shows All types and All years when both filters are at their defaults", () => {
      renderFilters({ type: "all", year: "all" });

      expect(typeTrigger()).toHaveTextContent("All types");
      expect(yearTrigger()).toHaveTextContent("All years");
    });

    it("shows the current type label", () => {
      renderFilters({ type: "income", year: "all" });

      expect(typeTrigger()).toHaveTextContent("Income");
    });

    it("shows the current year", () => {
      renderFilters({ type: "all", year: 2024 });

      expect(yearTrigger()).toHaveTextContent("2024");
    });
  });

  describe("changing the type", () => {
    it("navigates to the list with the selected type when it is not the default", async () => {
      const { user } = renderFilters({ type: "all", year: "all" });

      await user.click(typeTrigger());
      await user.click(await screen.findByRole("option", { name: "Expense" }));

      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith("/dashboard/transaction?type=expense");
    });

    it("keeps the current year in the URL when the type changes", async () => {
      const { user } = renderFilters({ type: "all", year: 2025 });

      await user.click(typeTrigger());
      await user.click(await screen.findByRole("option", { name: "Income" }));

      expect(pushMock).toHaveBeenCalledWith("/dashboard/transaction?type=income&year=2025");
    });

    it("omits the type from the URL when All types is selected", async () => {
      const { user } = renderFilters({ type: "income", year: 2025 });

      await user.click(typeTrigger());
      await user.click(await screen.findByRole("option", { name: "All types" }));

      expect(pushMock).toHaveBeenCalledWith("/dashboard/transaction?year=2025");
    });

    it("navigates to the bare list path when the type is reset and the year is all", async () => {
      const { user } = renderFilters({ type: "expense", year: "all" });

      await user.click(typeTrigger());
      await user.click(await screen.findByRole("option", { name: "All types" }));

      expect(pushMock).toHaveBeenCalledWith("/dashboard/transaction");
    });
  });

  describe("changing the year", () => {
    it("navigates to the list with the selected year", async () => {
      const { user } = renderFilters({ type: "all", year: "all" });

      await user.click(yearTrigger());
      await user.click(await screen.findByRole("option", { name: "2024" }));

      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith("/dashboard/transaction?year=2024");
    });

    it("keeps the current type in the URL when the year changes", async () => {
      const { user } = renderFilters({ type: "expense", year: "all" });

      await user.click(yearTrigger());
      await user.click(await screen.findByRole("option", { name: "2025" }));

      expect(pushMock).toHaveBeenCalledWith("/dashboard/transaction?type=expense&year=2025");
    });

    it("omits the year from the URL when All years is selected", async () => {
      const { user } = renderFilters({ type: "income", year: 2025 });

      await user.click(yearTrigger());
      await user.click(await screen.findByRole("option", { name: "All years" }));

      expect(pushMock).toHaveBeenCalledWith("/dashboard/transaction?type=income");
    });
  });
});
