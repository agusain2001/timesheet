"use client";

import { Plus } from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { GenericFilters } from "@/components/shared/GenericFilters";
import { GenericTable } from "@/components/shared/GenericTable";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { Column } from "@/components/shared/types";
import { showSuccess, showError } from "@/lib/toast";
import * as usersApi from "@/services/users";
import type { User, UserCreate } from "@/types/api";

// Display type for table
interface EmployeeDisplay {
  id: string;
  name: string;
  email: string;
  position: string;
  role: string;
  avatar_url: string;
}

export function ManageEmployees() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<UserCreate>({
    email: "",
    password: "",
    full_name: "",
    role: "employee",
    position: "",
  });

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await usersApi.getUsers({ search: search || undefined });
      setUsers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load employees";
      setError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEdit = async (employee: EmployeeDisplay) => {
    showSuccess(`Edit functionality coming soon for: ${employee.name}`);
  };

  const handleDelete = async (employee: EmployeeDisplay) => {
    if (!confirm(`Delete "${employee.name}"? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      await usersApi.deleteUser(employee.id);
      setUsers((prev) => prev.filter((u) => u.id !== employee.id));
      showSuccess("Employee deleted successfully");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to delete employee",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      showError("Full name is required");
      return;
    }
    if (!formData.email.trim()) {
      showError("Email is required");
      return;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    setIsSaving(true);
    try {
      const newUser = await usersApi.createUser(formData);
      setUsers((prev) => [...prev, newUser]);
      showSuccess("Employee created successfully!");
      setShowAddModal(false);
      setFormData({ email: "", password: "", full_name: "", role: "employee", position: "" });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setFormData({ email: "", password: "", full_name: "", role: "employee", position: "" });
    setShowAddModal(true);
  };

  const columns: Column<EmployeeDisplay>[] = [
    {
      key: "name",
      label: "Name",
      render: (_, employee) => (
        <span className="flex items-center gap-2">
          {employee.avatar_url ? (
            <Image
              className="rounded-full object-cover"
              src={employee.avatar_url}
              alt={employee.name}
              height={40}
              width={40}
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
              {employee.name.charAt(0).toUpperCase()}
            </div>
          )}
          {employee.name}
        </span>
      ),
    },
    { key: "email", label: "Email" },
    { key: "position", label: "Position" },
    { key: "role", label: "Role" },
  ];

  // Transform users to display format
  const processedData = useMemo(() => {
    return users.map((user) => ({
      id: user.id,
      name: user.full_name,
      email: user.email,
      position: user.position || "Not Set",
      role: user.role,
      avatar_url: user.avatar_url || "",
    }));
  }, [users]);

  if (error && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchUsers}>Retry</Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <section className="flex overflow-hidden flex-col gap-2 h-full w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Manage Employees</h1>
          <Button icon={<Plus size={16} />} onClick={openAddModal}>Add Employee</Button>
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
            emptyStateTitle="No employees yet!"
            emptyStateDescription="Manage and organize all your employees in one place, keep everything structured, and add an employee to get started today."
            emptyStateButtonLabel="Add Employee"
            onEmptyStateClick={openAddModal}
            gridColsClass="grid grid-cols-4"
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </section>

      {/* Add Employee Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Employee">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="employee@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">Role</label>
              <select
                value={formData.role || "employee"}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">Position</label>
              <input
                type="text"
                value={formData.position || ""}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Developer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-foreground/10">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Employee"}
            </Button>
          </div>
        </form>
      </Modal>
    </ErrorBoundary>
  );
}
