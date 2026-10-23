"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { LayoutDashboardIcon, LogOutIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserMenuProps = {
  displayName: string;
  email: string | null;
  imageUrl: string | null;
};

const INITIALS_SEPARATOR_PATTERN = /[\s._@-]+/;
const MAX_INITIALS = 2;

function getInitials(displayName: string, email: string | null): string {
  const source = displayName.trim() || email?.trim() || "";
  const initials = source
    .split(INITIALS_SEPARATOR_PATTERN)
    .filter((word) => word.length > 0)
    .slice(0, MAX_INITIALS)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return initials || "?";
}

export function UserMenu({ displayName, email, imageUrl }: UserMenuProps) {
  const { signOut } = useClerk();
  const initials = getInitials(displayName, email);

  return (
    <div className="flex items-center gap-3">
      {email ? (
        <span className="hidden max-w-64 truncate text-sm text-white/80 md:block">
          {email}
        </span>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-lg"
              className="rounded-full text-white hover:bg-white/10"
              aria-label="Open user menu"
            />
          }
        >
          <Avatar>
            <AvatarImage src={imageUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="bg-primary-foreground/20 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground">
                {displayName}
              </span>
              {email ? (
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {email}
                </span>
              ) : null}
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem render={<Link href="/dashboard" />}>
            <LayoutDashboardIcon />
            Dashboard
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              void signOut({ redirectUrl: "/" });
            }}
          >
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
