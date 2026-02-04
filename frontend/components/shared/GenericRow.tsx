"use client";

import { useState, useRef } from "react";
import { RowActionsMenu } from "./RowActionsMenu";
import { Column } from "./types";

interface Props<T> {
  item: T;
  selected: boolean;
  onSelect: () => void;
  columns: Column<T>[];
  gridColsClass: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function GenericRow<T extends { id: string }>({
  item,
  selected,
  onSelect,
  columns,
  gridColsClass,
  onEdit,
  onDelete,
}: Props<T>) {
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative ${gridColsClass} items-center px-6 py-3 text-sm
  border-b border-foreground/10
  hover:bg-foreground/5
  transition-colors`}
    >
      {columns.map((column) => {
        const value = item[column.key];
        const rendered = column.render
          ? column.render(value, item)
          : String(value || "");

        const colSpanClass = column.colSpan ? `col-span-${column.colSpan}` : "";

        // Render checkbox for first column
        if (columns.indexOf(column) === 0) {
          return (
            <span
              key={column.key as string}
              className={`flex items-center gap-2 ${colSpanClass}`}
            >
              <input
                type="checkbox"
                checked={selected}
                onClick={(e) => e.stopPropagation()}
                onChange={onSelect}
              />
              {rendered}
            </span>
          );
        }

        return (
          <span key={column.key as string} className={colSpanClass}>
            {rendered}
          </span>
        );
      })}

      {isHovered && (onEdit || onDelete) && (
        <div
          ref={menuRef}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-50"
          onMouseEnter={() => setIsHovered(true)}
        >
          <RowActionsMenu
            onEdit={onEdit || (() => {})}
            onDelete={onDelete || (() => {})}
          />
        </div>
      )}
    </div>
  );
}
