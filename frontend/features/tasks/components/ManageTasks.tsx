"use client";

import { Plus, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { GenericFilters } from "@/components/shared/GenericFilters";
import { GenericTable } from "@/components/shared/GenericTable";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { Column } from "@/components/shared/types";
import { showSuccess, showError } from "@/lib/toast";
import * as tasksApi from "@/services/tasks";
import * as usersApi from "@/services/users";
import type { Task, TaskCreate } from "@/services/tasks";
import type { User } from "@/types/api";

interface TaskDisplay {
    id: string;
    name: string;
    status: string;
    priority: string;
    assignee: string;
    due_date: string;
}

const priorityColors: Record<string, string> = {
    high: "text-red-500",
    urgent: "text-red-600",
    medium: "text-yellow-500",
    low: "text-green-500",
};

const statusIcons: Record<string, React.ReactNode> = {
    completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    in_progress: <Clock className="w-4 h-4 text-blue-500" />,
    pending: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    todo: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    backlog: <Clock className="w-4 h-4 text-gray-500" />,
};

export function ManageTasks() {
    const [sortField, setSortField] = useState<keyof TaskDisplay | null>(null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [search, setSearch] = useState("");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<TaskCreate>({
        name: "",
        description: "",
        priority: "medium",
        due_date: "",
        assignee_id: "",
    });

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await tasksApi.getTasks({ search: search || undefined });
            setTasks(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load tasks";
            setError(message);
            showError(message);
        } finally {
            setIsLoading(false);
        }
    }, [search]);

    // Fetch users for assignee dropdown
    const fetchUsers = useCallback(async () => {
        try {
            const data = await usersApi.getUsers();
            setUsers(data);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
        fetchUsers();
    }, [fetchTasks, fetchUsers]);

    const handleSortChange = (field: string) => {
        const key = field as keyof TaskDisplay;
        if (sortField === key) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortField(key);
            setSortOrder("asc");
        }
    };

    const handleEdit = async (task: TaskDisplay) => {
        showSuccess(`Edit functionality coming soon for: ${task.name}`);
    };

    const handleDelete = async (task: TaskDisplay) => {
        if (!confirm(`Delete "${task.name}"? This cannot be undone.`)) return;

        setIsLoading(true);
        try {
            await tasksApi.deleteTask(task.id);
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
            showSuccess("Task deleted successfully");
        } catch (err) {
            showError(
                err instanceof Error ? err.message : "Failed to delete task",
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            showError("Task name is required");
            return;
        }

        setIsSaving(true);
        try {
            const taskData: TaskCreate = {
                name: formData.name,
                description: formData.description,
                priority: formData.priority,
                due_date: formData.due_date || undefined,
                assignee_id: formData.assignee_id || undefined,
                task_type: "assigned",
            };
            const newTask = await tasksApi.createTask(taskData);
            setTasks((prev) => [...prev, newTask]);
            showSuccess("Task created successfully!");
            setShowAddModal(false);
            setFormData({ name: "", description: "", priority: "medium", due_date: "", assignee_id: "" });
        } catch (err) {
            showError(err instanceof Error ? err.message : "Failed to create task");
        } finally {
            setIsSaving(false);
        }
    };

    const openAddModal = () => {
        setFormData({ name: "", description: "", priority: "medium", due_date: "", assignee_id: "" });
        setShowAddModal(true);
    };

    const columns: Column<TaskDisplay>[] = [
        {
            key: "name",
            label: "Name",
            render: (_, task) => (
                <span className="flex items-center gap-2">
                    {statusIcons[task.status] || statusIcons.pending}
                    {task.name}
                </span>
            ),
        },
        {
            key: "priority",
            label: "Priority",
            render: (value) => (
                <span className={`font-medium capitalize ${priorityColors[value as string] || ""}`}>
                    {value}
                </span>
            ),
        },
        { key: "assignee", label: "Assignee" },
        { key: "due_date", label: "Due Date" },
    ];

    const processedData = useMemo(() => {
        const mapped = tasks.map((task) => ({
            id: task.id,
            name: task.name,
            status: task.status,
            priority: task.priority,
            assignee: task.assignee?.full_name || "Unassigned",
            due_date: task.due_date ? new Date(task.due_date).toLocaleDateString() : "No Due Date",
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
    }, [sortField, sortOrder, tasks]);

    if (error && tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchTasks}>Retry</Button>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <section className="flex overflow-hidden flex-col gap-2 h-full w-full">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Manage Tasks</h1>
                    <Button icon={<Plus size={16} />} onClick={openAddModal}>Add Task</Button>
                </div>

                <GenericFilters
                    sortOptions={[
                        { key: "priority", label: "Sort by Priority" },
                        { key: "due_date", label: "Sort by Due Date" },
                        { key: "status", label: "Sort by Status" },
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
                        emptyStateTitle="No tasks yet!"
                        emptyStateDescription="Manage and organize all your tasks in one place. Add a task to get started."
                        emptyStateButtonLabel="Add Task"
                        onEmptyStateClick={openAddModal}
                        gridColsClass="grid grid-cols-4"
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                )}
            </section>

            {/* Add Task Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Task">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                            Task Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter task name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1.5">Description</label>
                        <textarea
                            value={formData.description || ""}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Task description"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground/70 mb-1.5">Priority</label>
                            <select
                                value={formData.priority || "medium"}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskCreate["priority"] })}
                                className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground/70 mb-1.5">Due Date</label>
                            <input
                                type="date"
                                value={formData.due_date || ""}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1.5">Assignee</label>
                        <select
                            value={formData.assignee_id || ""}
                            onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                            className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Unassigned</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-foreground/10">
                        <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? "Creating..." : "Create Task"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </ErrorBoundary>
    );
}
