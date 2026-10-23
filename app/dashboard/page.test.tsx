import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";
import { getTransactions } from "@/data/getTransactions";

const { protectMock, redirectMock } = vi.hoisted(() => ({
  protectMock: vi.fn(),
  // Mirrors next/navigation redirect(), which throws to stop rendering. The sentinel message carries the target.
  redirectMock: vi.fn((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: protectMock },
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/data/getTransactions", () => ({
  getTransactions: vi.fn(),
}));

const USER_ID = "user_123";
const CURRENT_YEAR = new Date().getFullYear();

// Runs the async server component with the given query params.
async function renderPage(searchParams: Record<string, string | string[]> = {}) {
  return DashboardPage({ searchParams: Promise.resolve(searchParams) });
}

beforeEach(() => {
  vi.clearAllMocks();
  protectMock.mockResolvedValue({ userId: USER_ID });
  vi.mocked(getTransactions).mockResolvedValue([]);
});

describe("DashboardPage", () => {
  it("redirects an out-of-range year to the bare dashboard without loading transactions", async () => {
    await expect(renderPage({ year: "1999" })).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
    expect(getTransactions).not.toHaveBeenCalled();
  });

  it("redirects a repeated year to the canonical year of its first value without loading transactions", async () => {
    await expect(renderPage({ year: ["2024", "2025"] })).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard?year=2024",
    );

    expect(getTransactions).not.toHaveBeenCalled();
  });

  it("does not redirect a valid year and loads transactions for that year", async () => {
    await renderPage({ year: "2024" });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(getTransactions).toHaveBeenCalledWith(USER_ID, 2024);
  });

  it("does not redirect when there is no year param and loads the current year", async () => {
    await renderPage();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(getTransactions).toHaveBeenCalledWith(USER_ID, CURRENT_YEAR);
  });

  it("does not load any transactions when the user is not authenticated", async () => {
    protectMock.mockRejectedValue(new Error("Unauthorized"));

    await expect(renderPage({ year: "1999" })).rejects.toThrow("Unauthorized");

    expect(redirectMock).not.toHaveBeenCalled();
    expect(getTransactions).not.toHaveBeenCalled();
  });
});
