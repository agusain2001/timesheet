"use client";

import { useState } from "react";
import { DivisionsEmptyState } from "./DivisionsEmptyState";
import { DivisionsRow } from "./DivisionsRow";
import { Client, Division } from "@/types/constants";
import { DivisionsTableHeader } from "./DivisionsTableHeader";
import { ClientsTableHeader } from "@/features/clients/components/ClientsTableHeader";

interface Props {
  divisions: Division[];
}

export function DivisionsTable({ divisions }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allSelected =
    divisions.length > 0 && selectedIds.length === divisions.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(divisions.map((c) => c.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="h-full rounded-md flex-1 flex flex-col">
      <DivisionsTableHeader
        allSelected={allSelected}
        onSelectAll={handleSelectAll}
      />

      {divisions.length === 0 ? (
        <DivisionsEmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {divisions.map((division) => (
            <DivisionsRow
              key={division.id}
              division={division}
              selected={selectedIds.includes(division.id)}
              onSelect={() => handleSelectOne(division.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
