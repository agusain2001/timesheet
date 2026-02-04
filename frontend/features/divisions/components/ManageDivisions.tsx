"use client";

import { Plus } from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { GenericFilters } from "@/components/shared/GenericFilters";
import { GenericTable } from "@/components/shared/GenericTable";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { Column } from "@/components/shared/types";
import { showSuccess, showError } from "@/lib/toast";
import * as departmentsApi from "@/services/departments";
import type { Department, DepartmentCreate } from "@/types/api";

// Display type for table
interface DepartmentDisplay {
  id: string;
  name: string;
  managerName: string;
  notes: string;
}

export function ManageDivisions() {
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<DepartmentCreate>({
    name: "",
    notes: "",
  });

  // Fetch departments from API
  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await departmentsApi.getDepartments({ search: search || undefined });
      setDepartments(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load departments";
      setError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleEdit = async (dept: DepartmentDisplay) => {
    showSuccess(`Edit functionality coming soon for: ${dept.name}`);
  };

  const handleDelete = async (dept: DepartmentDisplay) => {
    if (!confirm(`Delete "${dept.name}"? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      await departmentsApi.deleteDepartment(dept.id);
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
      showSuccess("Department deleted successfully");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to delete department",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError("Division name is required");
      return;
    }

    setIsSaving(true);
    try {
      const newDept = await departmentsApi.createDepartment(formData);
      setDepartments((prev) => [...prev, newDept]);
      showSuccess("Division created successfully!");
      setShowAddModal(false);
      setFormData({ name: "", notes: "" });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create division");
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setFormData({ name: "", notes: "" });
    setShowAddModal(true);
  };

  const columns: Column<DepartmentDisplay>[] = [
    { key: "name", label: "Department", colSpan: 1 },
    { key: "managerName", label: "Manager", colSpan: 1 },
    { key: "notes", label: "Description", colSpan: 2 },
  ];

  // Transform departments to display format
  const processedData = useMemo(() => {
    return departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      managerName: dept.managers.find((m) => m.is_primary)?.employee_name ||
        dept.managers[0]?.employee_name || "No Manager",
      notes: dept.notes || "",
    }));
  }, [departments]);

  if (error && departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchDepartments}>Retry</Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <section className="flex overflow-hidden flex-col gap-2 h-full w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Manage Divisions</h1>
          <Button icon={<Plus size={16} />} onClick={openAddModal}>Add Division</Button>
        </div>

        <GenericFilters
          sortOptions={[]}
          sortField={null}
          sortOrder="asc"
          search={search}
          setSearch={setSearch}
        />

        {isLoading ? (
          <TableSkeleton rowCount={3} columnCount={4} />
        ) : (
          <GenericTable
            items={processedData}
            columns={columns}
            emptyStateTitle="No divisions yet!"
            emptyStateDescription="Manage and organize all your divisions in one place, keep everything structured, and add a division to get started today."
            emptyStateButtonLabel="Add Division"
            onEmptyStateClick={openAddModal}
            gridColsClass="grid grid-cols-4"
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </section>

      {/* Add Division Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Division">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter division name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">Description</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Brief description of this division"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-foreground/10">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Division"}
            </Button>
          </div>
        </form>
      </Modal>
    </ErrorBoundary>
  );
}
