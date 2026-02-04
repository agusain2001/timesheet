"use client";

import { Funnel, Search } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

interface Props {
  sortField: "region" | "sector" | null;
  sortOrder: "asc" | "desc";
  search: string;
  setSearch: (value: string) => void;
}

export function EmployeesFilters({
  sortField,
  sortOrder,
  search,
  setSearch,
}: Props) {
  const [active, setActive] = useState(false);

  const isRegionActive = sortField === "region";
  const isSectorActive = sortField === "sector";

  const baseButton =
    "flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border transition-colors";

  const activeStyles =
    "bg-blue-600/20 border-blue-600/40 text-blue-600 dark:text-blue-400";

  const inactiveStyles =
    "bg-blue-600/10 border-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20";

  return (
    <div className="flex items-center justify-between">
      {/* Filters */}

      <div className="flex items-center gap-3"></div>

      {/* Search */}
      <div className="flex justify-end">
        <div
          className={clsx(
            "relative flex items-center transition-all duration-300 ease-in-out rounded-md border border-transparent",
            active ? "w-64 bg-foreground/5 border-foreground/10" : "w-32",
          )}
        >
          <Search className="absolute left-3 w-4 text-foreground/50 pointer-events-none" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            onFocus={() => setActive(true)}
            onBlur={(e) => !e.target.value && setActive(false)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-transparent outline-none text-foreground placeholder:text-foreground/50"
          />
        </div>
      </div>
    </div>
  );
}
