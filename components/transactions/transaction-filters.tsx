"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildTransactionFiltersHref,
  type TransactionFilters as TransactionFiltersValue,
  type TypeFilter,
  type YearFilter,
} from "@/lib/transaction-filters";

type TransactionFiltersProps = {
  type: TypeFilter;
  year: YearFilter;
  years: number[];
};

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const ALL_YEARS_OPTION = { value: "all", label: "All years" } as const;

// Filters live in the URL, so each change navigates to the new query string.
export default function TransactionFilters({
  type,
  year,
  years,
}: TransactionFiltersProps) {
  const router = useRouter();
  const current: TransactionFiltersValue = { type, year };

  const yearItems = [
    ALL_YEARS_OPTION,
    ...years.map((option) => ({ value: String(option), label: String(option) })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        items={TYPE_OPTIONS}
        value={type}
        onValueChange={(value) => {
          if (value) {
            router.push(
              buildTransactionFiltersHref(current, {
                type: value === "income" || value === "expense" ? value : "all",
              }),
            );
          }
        }}
      >
        <SelectTrigger aria-label="Filter by type" className="h-10 px-3 text-base">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={yearItems}
        value={String(year)}
        onValueChange={(value) => {
          if (value) {
            router.push(
              buildTransactionFiltersHref(current, {
                year: value === "all" ? "all" : Number(value),
              }),
            );
          }
        }}
      >
        <SelectTrigger aria-label="Filter by year" className="h-10 px-3 text-base">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {yearItems.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
