"use client";

import { Column } from "./types";

interface Props<T> {
  columns: Column<T>[];
  allSelected: boolean;
  onSelectAll: () => void;
  gridColsClass: string;
}

export function GenericTableHeader<T>({
  columns,
  allSelected,
  onSelectAll,
  gridColsClass,
}: Props<T>) {
  return (
    <div
      className={`${gridColsClass} px-6 py-3 text-sm border-t border-b border-foreground/10 dark:border-white/10`}
    >
      {columns.map((column, index) => {
        const colSpanClass = column.colSpan ? `col-span-${column.colSpan}` : "";

        // Render checkbox and label for first column
        if (index === 0) {
          return (
            <span
              key={column.key as string}
              className={`flex items-center gap-2 ${colSpanClass}`}
            >
              <input
                type="checkbox"
                className="relative top-px scale-125 accent-blue-600 cursor-pointer"
                checked={allSelected}
                onChange={onSelectAll}
              />
              <span
                onClick={onSelectAll}
                className="cursor-pointer font-semibold text-foreground"
              >
                {column.label}
              </span>
            </span>
          );
        }

        return (
          <span
            key={column.key as string}
            className={`font-semibold text-foreground ${colSpanClass}`}
          >
            {column.label}
          </span>
        );
      })}
    </div>
  );
}
