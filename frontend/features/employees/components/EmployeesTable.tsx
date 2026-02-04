"use client";

import { useState } from "react";
import { EmployeesEmptyState } from "./EmployeesEmptyState";
import { EmployeesRow } from "./EmployeesRow";
import { Employee } from "@/types/constants";
import { EmployeesTableHeader } from "./EmployeesTableHeader";

interface Props {
  employees: Employee[];
}

export function EmployeesTable({ employees }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allSelected =
    employees.length > 0 && selectedIds.length === employees.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map((c) => c.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="h-full rounded-md flex-1 flex flex-col">
      <EmployeesTableHeader
        allSelected={allSelected}
        onSelectAll={handleSelectAll}
      />

      {employees.length === 0 ? (
        <EmployeesEmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {employees.map((employee) => (
            <EmployeesRow
              key={employee.id}
              employee={employee}
              selected={selectedIds.includes(employee.id)}
              onSelect={() => handleSelectOne(employee.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
