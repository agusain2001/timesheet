"use client";

import { Plus } from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { GenericFilters } from "@/components/shared/GenericFilters";
import { GenericTable } from "@/components/shared/GenericTable";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { Column } from "@/components/shared/types";
import { showSuccess, showError } from "@/lib/toast";
import * as projectsApi from "@/services/projects";
import type { Project } from "@/services/projects";

interface ProjectDisplay {
    id: string;
    name: string;
    status: string;
    start_date: string;
    end_date: string;
}

export function ManageProjects() {
    const [sortField, setSortField] = useState<keyof ProjectDisplay | null>(null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [search, setSearch] = useState("");
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await projectsApi.getProjects({ search: search || undefined });
            setProjects(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load projects";
            setError(message);
            showError(message);
        } finally {
            setIsLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleSortChange = (field: string) => {
        const key = field as keyof ProjectDisplay;
        if (sortField === key) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortField(key);
            setSortOrder("asc");
        }
    };

    const handleEdit = async (project: ProjectDisplay) => {
        showSuccess(`Edit functionality coming soon for: ${project.name}`);
    };

    const handleDelete = async (project: ProjectDisplay) => {
        if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;

        setIsLoading(true);
        try {
            await projectsApi.deleteProject(project.id);
            setProjects((prev) => prev.filter((p) => p.id !== project.id));
            showSuccess("Project deleted successfully");
        } catch (err) {
            showError(
                err instanceof Error ? err.message : "Failed to delete project",
            );
        } finally {
            setIsLoading(false);
        }
    };

    const columns: Column<ProjectDisplay>[] = [
        { key: "name", label: "Name" },
        { key: "status", label: "Status" },
        { key: "start_date", label: "Start Date" },
        { key: "end_date", label: "End Date" },
    ];

    const processedData = useMemo(() => {
        const mapped = projects.map((project) => ({
            id: project.id,
            name: project.name,
            status: project.status,
            start_date: project.start_date || "Not Set",
            end_date: project.end_date || "Not Set",
        }));

        if (sortField) {
            mapped.sort((a, b) => {
                const aVal = String(a[sortField] || "").toLowerCase();
                const bVal = String(b[sortField] || "").toLowerCase();
                if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
                if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
                return 0;
            });
        }

        return mapped;
    }, [sortField, sortOrder, projects]);

    if (error && projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchProjects}>Retry</Button>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <section className="flex overflow-hidden flex-col gap-2 h-full w-full">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Manage Projects</h1>
                    <Button icon={<Plus size={16} />}>Add Project</Button>
                </div>

                <GenericFilters
                    sortOptions={[
                        { key: "status", label: "Sort by Status" },
                        { key: "start_date", label: "Sort by Start Date" },
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
                        emptyStateTitle="No projects yet!"
                        emptyStateDescription="Manage and organize all your projects in one place. Add a project to get started."
                        emptyStateButtonLabel="Add Project"
                        gridColsClass="grid grid-cols-4"
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                )}
            </section>
        </ErrorBoundary>
    );
}
