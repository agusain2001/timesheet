"use client";

import { useState } from "react";
import { ClientsEmptyState } from "./ClientsEmptyState";
import { ClientsRow } from "./ClientsRow";
import { Client } from "@/types/constants";
import { ClientsTableHeader } from "./ClientsTableHeader";

interface Props {
  clients: Client[];
}

export function ClientsTable({ clients }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allSelected =
    clients.length > 0 && selectedIds.length === clients.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(clients.map((c) => c.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="h-full rounded-md flex-1 flex flex-col">
      <ClientsTableHeader
        allSelected={allSelected}
        onSelectAll={handleSelectAll}
      />

      {clients.length === 0 ? (
        <ClientsEmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {clients.map((client) => (
            <ClientsRow
              key={client.id}
              client={client}
              selected={selectedIds.includes(client.id)}
              onSelect={() => handleSelectOne(client.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
