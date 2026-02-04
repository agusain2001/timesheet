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
import * as clientsApi from "@/services/clients";
import type { Client, ClientCreate } from "@/types/api";

export function ManageClients() {
  const [sortField, setSortField] = useState<keyof Client | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ClientCreate>({
    name: "",
    alias: "",
    region: "",
    business_sector: "",
  });

  // Fetch clients from API
  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await clientsApi.getClients({ search: search || undefined });
      setClients(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load clients";
      setError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSortChange = (field: string) => {
    const key = field as keyof Client;
    if (sortField === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(key);
      setSortOrder("asc");
    }
  };

  const handleEdit = async (client: Client) => {
    // TODO: Implement edit modal
    showSuccess(`Edit functionality coming soon for: ${client.name}`);
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Delete "${client.name}"? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      await clientsApi.deleteClient(client.id);
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      showSuccess("Client deleted successfully");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to delete client",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError("Client name is required");
      return;
    }

    setIsSaving(true);
    try {
      const newClient = await clientsApi.createClient(formData);
      setClients((prev) => [...prev, newClient]);
      showSuccess("Client created successfully!");
      setShowAddModal(false);
      setFormData({ name: "", alias: "", region: "", business_sector: "" });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setFormData({ name: "", alias: "", region: "", business_sector: "" });
    setShowAddModal(true);
  };

  const columns: Column<Client>[] = [
    { key: "name", label: "Name" },
    { key: "alias", label: "Alias" },
    { key: "region", label: "Region" },
    { key: "business_sector", label: "Business Sector" },
  ];

  const processedData = useMemo(() => {
    let filtered = [...clients];

    // Sort
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = String(a[sortField] || "").toLowerCase();
        const bVal = String(b[sortField] || "").toLowerCase();

        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [sortField, sortOrder, clients]);

  if (error && clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchClients}>Retry</Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <section className="flex overflow-hidden flex-col gap-2 h-full w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Manage Clients</h1>
          <Button icon={<Plus size={16} />} onClick={openAddModal}>Add Client</Button>
        </div>

        <GenericFilters
          sortOptions={[
            { key: "region", label: "Sort by Region" },
            { key: "business_sector", label: "Sort by Sector" },
          ]}
          sortField={sortField as string | null}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          search={search}
          setSearch={setSearch}
        />

        {isLoading ? (
          <TableSkeleton rowCount={3} columnCount={4} />
        ) : (
          <GenericTable
            items={processedData}
            columns={columns}
            emptyStateTitle="No clients yet!"
            emptyStateDescription="Manage and organize all your clients in one place, keep everything structured, and add a client to get started today."
            emptyStateButtonLabel="Add Client"
            onEmptyStateClick={openAddModal}
            gridColsClass="grid grid-cols-4"
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </section>

      {/* Add Client Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Client">
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
              placeholder="Enter client name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">Alias</label>
            <input
              type="text"
              value={formData.alias || ""}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Short alias"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">Region</label>
              <input
                type="text"
                value={formData.region || ""}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., North America"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">Business Sector</label>
              <input
                type="text"
                value={formData.business_sector || ""}
                onChange={(e) => setFormData({ ...formData, business_sector: e.target.value })}
                className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Technology"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-foreground/10">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </form>
      </Modal>
    </ErrorBoundary>
  );
}
