"use client";

import { useState } from "react";
import { GenericEmptyState } from "./GenericEmptyState";
import { GenericRow } from "./GenericRow";
import { GenericTableHeader } from "./GenericTableHeader";
import { Column, SortConfig } from "./types";

interface Props<T extends { id: string }> {
  items: T[];
  columns: Column<T>[];
  emptyStateTitle: string;
  emptyStateDescription: string;
  emptyStateButtonLabel?: string;
  onEmptyStateClick?: () => void;
  gridColsClass: string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export function GenericTable<T extends { id: string }>({
  items,
  columns,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateButtonLabel,
  onEmptyStateClick,
  gridColsClass,
  onEdit,
  onDelete,
}: Props<T>) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="h-full rounded-md flex-1 flex flex-col">
      <GenericTableHeader
        columns={columns}
        allSelected={allSelected}
        onSelectAll={handleSelectAll}
        gridColsClass={gridColsClass}
      />

      {items.length === 0 ? (
        <GenericEmptyState
          title={emptyStateTitle}
          description={emptyStateDescription}
          buttonLabel={emptyStateButtonLabel}
          onButtonClick={onEmptyStateClick}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {items.map((item) => (
            <GenericRow
              key={item.id}
              item={item}
              selected={selectedIds.includes(item.id)}
              onSelect={() => handleSelectOne(item.id)}
              columns={columns}
              gridColsClass={gridColsClass}
              onEdit={() => onEdit?.(item)}
              onDelete={() => onDelete?.(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
