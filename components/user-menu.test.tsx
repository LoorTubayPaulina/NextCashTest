// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserMenu } from "@/components/user-menu";

const { signOutMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: signOutMock }),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  signOutMock.mockReset();
});

const DISPLAY_NAME = "Ada Lovelace";
const EMAIL = "ada@example.com";

// user-event's pointer sequence does not open the base-ui menu under jsdom,
// while a plain click event does (verified with a probe), so the trigger is opened with fireEvent.
function openMenu(): void {
  fireEvent.click(screen.getByRole("button", { name: "Open user menu" }));
}

describe("UserMenu", () => {
  describe("avatar trigger", () => {
    it("shows the initials of the display name when there is no image", () => {
      render(<UserMenu displayName={DISPLAY_NAME} email={EMAIL} imageUrl={null} />);

      expect(screen.getByRole("button", { name: "Open user menu" })).toHaveTextContent("AL");
    });

    it("exposes the trigger as a button with an accessible name", () => {
      render(<UserMenu displayName={DISPLAY_NAME} email={EMAIL} imageUrl={null} />);

      expect(screen.getByRole("button", { name: "Open user menu" })).toBeInTheDocument();
    });
  });

  describe("when opened", () => {
    it("shows the Dashboard and Sign out items",  () => {
      render(<UserMenu displayName={DISPLAY_NAME} email={EMAIL} imageUrl={null} />);

      openMenu();

      expect(screen.getByRole("menuitem", { name: "Dashboard" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
    });

    it("shows the display name and email in the menu header",  () => {
      render(<UserMenu displayName={DISPLAY_NAME} email={EMAIL} imageUrl={null} />);

      openMenu();

      const menu = screen.getByRole("menu");
      expect(within(menu).getByText(DISPLAY_NAME)).toBeInTheDocument();
      expect(within(menu).getByText(EMAIL)).toBeInTheDocument();
    });

    it("renders the Dashboard item as a link to /dashboard",  () => {
      render(<UserMenu displayName={DISPLAY_NAME} email={EMAIL} imageUrl={null} />);

      openMenu();

      expect(screen.getByRole("menuitem", { name: "Dashboard" })).toHaveAttribute(
        "href",
        "/dashboard",
      );
    });
  });

  describe("sign out", () => {
    it("calls signOut once with redirectUrl '/' when Sign out is clicked", async () => {
      render(<UserMenu displayName={DISPLAY_NAME} email={EMAIL} imageUrl={null} />);

      openMenu();
      await userEvent.setup().click(screen.getByRole("menuitem", { name: "Sign out" }));

      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: "/" });
    });
  });
});
