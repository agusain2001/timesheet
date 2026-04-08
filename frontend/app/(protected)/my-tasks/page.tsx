"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { getToken } from "@/lib/auth";
import { ViewSwitcher, ViewToolbar, type ViewType, type FilterState } from "@/components/views/ViewSwitcher";
import KanbanBoard from "@/components/views/KanbanBoard";
import CalendarView from "@/components/views/CalendarView";
import GanttView from "@/components/views/GanttView";
import SwimlaneView from "@/components/views/SwimlaneView";
import TaskListPage from "@/components/TaskListPage";
import AddTaskModal from "@/components/AddTaskModal";
import EditTaskModal from "@/components/EditTaskModal";
import DeleteTaskModal from "@/components/DeleteTaskModal";
import DuplicateTaskModal from "@/components/DuplicateTaskModal";
import CommentsModal from "@/components/CommentsModal";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import BulkActionBar from "@/components/views/BulkActionBar";
import { HowItWorks } from "@/components/ui/HowItWorks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
    id: string;
    name: string;
    status: string;
    priority?: string;
    due_date?: string;
    start_date?: string;
    assignee_id?: string;
    assignee?: { id: string; full_name: string; avatar_url?: string };
    tags?: string[];
    is_blocked?: boolean;
    blocked_by?: { id: string; name: string }[];
    estimated_hours?: number;
    progress?: number;
    description?: string;
    task_type?: string;
    project_id?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, {
        ...opts,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(opts.headers || {}),
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "Request failed");
    }
    if (res.status === 204) return null;
    return res.json();
}

// ─── Toast Notification ───────────────────────────────────────────────────────

function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 3500);
        return () => clearTimeout(t);
    }, [onDismiss]);

    return (
        <div
            className={`fixed bottom-20 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all animate-in slide-in-from-bottom-2 duration-300 ${type === "success"
                ? "bg-green-500/10 border border-green-500/25 text-green-400"
                : "bg-red-500/10 border border-red-500/25 text-red-400"
                }`}
        >
            {type === "success" ? "✓" : "✕"} {message}
            <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
        </div>
    );
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function buildDateFilterLabel(startDate: string, endDate: string): string {
    if (startDate === endDate) {
        const d = new Date(startDate + "T00:00:00");
        if (d.toDateString() === new Date().toDateString()) return "Today";
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    const s = new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const e = new Date(endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${s} – ${e}`;
}

// ─── Multi-View Tasks Page ────────────────────────────────────────────────────

function MyTasksContent() {
    const searchParams = useSearchParams();
    const urlStartDate = searchParams.get("start_date");
    const urlEndDate = searchParams.get("end_date");

    const dateFilter =
        urlStartDate && urlEndDate
            ? { startDate: urlStartDate, endDate: urlEndDate, label: buildDateFilterLabel(urlStartDate, urlEndDate) }
            : undefined;

    const [view, setView] = useState<ViewType>("list");

    // Hydrate view from localStorage only on client after mount
    useEffect(() => {
        const saved = localStorage.getItem("tasks_view") as ViewType;
        if (saved) setView(saved);
    }, []);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<FilterState>({ status: "", priority: "", assignee: "", search: "" });
    const [sortBy, setSortBy] = useState("due_date");
    const [groupBy, setGroupBy] = useState("");

    // ─── Modal State ──────────────────────────────────────────────────────────
    const [showAddModal, setShowAddModal] = useState(false);
    const [addModalDefaultDate, setAddModalDefaultDate] = useState<string | undefined>(undefined);
    const [addModalDefaultStatus, setAddModalDefaultStatus] = useState<string | undefined>(undefined);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editTask, setEditTask] = useState<Task | null>(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTask, setDeleteTask] = useState<Task | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateTask, setDuplicateTask] = useState<Task | null>(null);
    const [isDuplicating, setIsDuplicating] = useState(false);

    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [commentsTask, setCommentsTask] = useState<Task | null>(null);

    const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

    // ─── Bulk Selection ───────────────────────────────────────────────────────
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

    // ─── Toast ────────────────────────────────────────────────────────────────
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
    }, []);

    // ─── View persistence ─────────────────────────────────────────────────────
    const handleViewChange = (v: ViewType) => {
        setView(v);
        localStorage.setItem("tasks_view", v);
        setSelectedTaskIds(new Set());
    };

    // ─── Fetch tasks ──────────────────────────────────────────────────────────
    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.status) params.set("status_filter", filters.status);
            if (filters.priority) params.set("priority", filters.priority);
            if (filters.assignee) params.set("assignee_id", filters.assignee);
            if (filters.search) params.set("search", filters.search);
            params.set("limit", "200");
            const data = await apiFetch(`/tasks/my?${params.toString()}`);
            setTasks(data || []);
        } catch {
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        if (view !== "list") {
            fetchTasks();
        }
    }, [view, fetchTasks]);

    useEffect(() => {
        apiFetch("/users?limit=100").then((d) => setUsers(d || [])).catch(() => { });
    }, []);

    // ─── Status change (Kanban drag / context menu) ────────────────────────────
    const handleStatusChange = async (taskId: string, newStatus: string) => {
        try {
            await apiFetch(`/tasks/${taskId}`, {
                method: "PUT",
                body: JSON.stringify({ status: newStatus }),
            });
            setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
            showToast("Status updated");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Update failed";
            showToast(msg, "error");
        }
    };

    // ─── Date change (Calendar drag) ──────────────────────────────────────────
    const handleTaskDateChange = async (taskId: string, newDate: string) => {
        try {
            await apiFetch(`/tasks/${taskId}`, {
                method: "PUT",
                body: JSON.stringify({ due_date: newDate }),
            });
            setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, due_date: newDate } : t));
            showToast("Due date updated");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Update failed";
            showToast(msg, "error");
        }
    };

    // ─── Date range change (Gantt drag) ───────────────────────────────────────
    const handleTaskDateRangeChange = async (taskId: string, startDate: string, endDate: string) => {
        try {
            await apiFetch(`/tasks/${taskId}`, {
                method: "PUT",
                body: JSON.stringify({ start_date: startDate, due_date: endDate }),
            });
            setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, start_date: startDate, due_date: endDate } : t));
            showToast("Dates updated");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Update failed";
            showToast(msg, "error");
        }
    };

    // ─── Click handlers ───────────────────────────────────────────────────────
    const handleTaskClick = (task: Task) => setDetailTaskId(task.id);
    const handleDateClick = (date: Date) => {
        setAddModalDefaultDate(date.toISOString().split("T")[0]);
        setAddModalDefaultStatus(undefined);
        setShowAddModal(true);
    };

    // ─── CRUD handlers ────────────────────────────────────────────────────────
    const handleEditTask = (task: Task) => {
        setEditTask(task);
        setShowEditModal(true);
    };

    const handleDeleteTask = (task: Task) => {
        setDeleteTask(task);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTask) return;
        setIsDeleting(true);
        try {
            await apiFetch(`/tasks/${deleteTask.id}`, { method: "DELETE" });
            setTasks((prev) => prev.filter((t) => t.id !== deleteTask.id));
            setShowDeleteModal(false);
            setDeleteTask(null);
            showToast("Task deleted");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Delete failed";
            showToast(msg, "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDuplicateTask = (task: Task) => {
        setDuplicateTask(task);
        setShowDuplicateModal(true);
    };

    const handleDuplicateConfirm = async () => {
        if (!duplicateTask) return;
        setIsDuplicating(true);
        try {
            await apiFetch(`/my-time/tasks/${duplicateTask.id}/duplicate`, { method: "POST" });
            setShowDuplicateModal(false);
            setDuplicateTask(null);
            await fetchTasks();
            showToast("Task duplicated");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Duplicate failed";
            showToast(msg, "error");
        } finally {
            setIsDuplicating(false);
        }
    };

    const handleViewComments = (task: Task) => {
        setCommentsTask(task);
        setShowCommentsModal(true);
    };

    const handleOpenAddForStatus = (status: string) => {
        setAddModalDefaultDate(undefined);
        setAddModalDefaultStatus(status);
        setShowAddModal(true);
    };

    // ─── Bulk Operations ──────────────────────────────────────────────────────
    const handleToggleSelect = (taskId: string) => {
        setSelectedTaskIds((prev) => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    const handleBulkStatusChange = async (status: string) => {
        const ids = Array.from(selectedTaskIds);
        try {
            await Promise.all(ids.map((id) => apiFetch(`/tasks/${id}`, {
                method: "PUT",
                body: JSON.stringify({ status }),
            })));
            setTasks((prev) => prev.map((t) => selectedTaskIds.has(t.id) ? { ...t, status } : t));
            setSelectedTaskIds(new Set());
            showToast(`Updated ${ids.length} task${ids.length !== 1 ? "s" : ""}`);
        } catch {
            showToast("Some updates failed", "error");
        }
    };

    const handleBulkPriorityChange = async (priority: string) => {
        const ids = Array.from(selectedTaskIds);
        try {
            await Promise.all(ids.map((id) => apiFetch(`/tasks/${id}`, {
                method: "PUT",
                body: JSON.stringify({ priority }),
            })));
            setTasks((prev) => prev.map((t) => selectedTaskIds.has(t.id) ? { ...t, priority } : t));
            setSelectedTaskIds(new Set());
            showToast(`Updated ${ids.length} task${ids.length !== 1 ? "s" : ""}`);
        } catch {
            showToast("Some updates failed", "error");
        }
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedTaskIds);
        if (!confirm(`Delete ${ids.length} task${ids.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
        try {
            await Promise.all(ids.map((id) => apiFetch(`/tasks/${id}`, { method: "DELETE" })));
            setTasks((prev) => prev.filter((t) => !selectedTaskIds.has(t.id)));
            setSelectedTaskIds(new Set());
            showToast(`Deleted ${ids.length} task${ids.length !== 1 ? "s" : ""}`);
        } catch {
            showToast("Some deletes failed", "error");
        }
    };

    // ─── Sort tasks client-side ───────────────────────────────────────────────
    const sortedTasks = [...tasks].sort((a, b) => {
        if (sortBy === "due_date") {
            return (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31");
        }
        if (sortBy === "priority") {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return (order[a.priority as keyof typeof order] ?? 4) - (order[b.priority as keyof typeof order] ?? 4);
        }
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0;
    });

    // ─── Common view props ────────────────────────────────────────────────────
    const commonViewProps = {
        onTaskClick: handleTaskClick,
        onEditTask: handleEditTask,
        onDeleteTask: handleDeleteTask,
        onDuplicateTask: handleDuplicateTask,
        onViewComments: handleViewComments,
        onStatusChange: handleStatusChange,
        selectedTaskIds,
        onToggleSelect: handleToggleSelect,
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">My Tasks</h1>
                    {view !== "list" && (
                        <p className="text-sm text-foreground/50 mt-0.5">
                            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                            {filters.status || filters.priority || filters.search ? " (filtered)" : ""}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <ViewSwitcher
                        currentView={view}
                        onChange={handleViewChange}
                        onSaveView={() => showToast("View saved")}
                        onShareView={() => showToast("Share link copied")}
                    />
                    <button
                        onClick={() => { setAddModalDefaultDate(undefined); setAddModalDefaultStatus(undefined); setShowAddModal(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                    >
                        <Plus size={15} /> New Task
                    </button>
                </div>
            </div>

            {/* How It Works */}
            {view === "list" && (
                <HowItWorks
                    pageKey="my-tasks-list"
                    color="blue"
                    description="List view shows all your assigned tasks in a sortable, filterable table — the quickest way to find and manage your tasks."
                    bullets={[
                        "Click any column header to sort tasks by that field.",
                        "Use the filter bar to narrow by status, priority, or assignee.",
                        "Select tasks with checkboxes to perform bulk status or priority changes.",
                        "Click a task name to open the details panel on the right.",
                    ]}
                />
            )}
            {view === "kanban" && (
                <HowItWorks
                    pageKey="my-tasks-kanban"
                    color="blue"
                    description="Kanban view organises your assigned tasks into columns by status — drag cards between columns to update their status instantly."
                    bullets={[
                        "Drag a card from one column to another to change its status.",
                        "Click the + button at the bottom of a column to add a task directly in that status.",
                        "Select multiple cards with checkboxes for bulk operations.",
                        "Click any card to open the full Task Detail panel.",
                    ]}
                />
            )}
            {view === "calendar" && (
                <HowItWorks
                    pageKey="my-tasks-calendar"
                    color="blue"
                    description="Calendar view plots your assigned tasks by due date — great for spotting deadline clusters and planning your week."
                    bullets={[
                        "Click any day cell to quickly add a task with that due date pre-filled.",
                        "Drag a task chip to a different day to reschedule it.",
                        "Click a task chip to open the details panel.",
                        "Use the month navigation arrows to browse past or future months.",
                    ]}
                />
            )}
            {view === "gantt" && (
                <HowItWorks
                    pageKey="my-tasks-gantt"
                    color="blue"
                    description="Gantt (Timeline) view shows your assigned tasks on a horizontal timeline — ideal for tracking project progress and date dependencies."
                    bullets={[
                        "Each bar represents a task's start-to-due date range.",
                        "Drag the right edge of a bar to extend or shorten its end date.",
                        "Drag the whole bar to shift both the start and end dates together.",
                        "Zoom in/out using the timeline scale controls at the top right.",
                    ]}
                />
            )}
            {view === "swimlane" && (
                <HowItWorks
                    pageKey="my-tasks-swimlane"
                    color="blue"
                    description="Swimlane view groups your assigned tasks into horizontal lanes."
                    bullets={[
                        "Change grouping with the Group By selector in the toolbar above.",
                        "Drag cards horizontally between status columns within a lane.",
                        "Click the + at the end of a lane to add a task directly into that group.",
                        "Collapsed lanes can be expanded by clicking the lane header.",
                    ]}
                />
            )}

            {/* Toolbar */}
            <ViewToolbar
                filters={filters}
                onFiltersChange={setFilters}
                sortBy={sortBy}
                onSortChange={setSortBy}
                groupBy={groupBy}
                onGroupChange={setGroupBy}
                users={users}
            />

            {/* View Content */}
            <div className="flex-1 overflow-hidden">
                {view === "list" && (
                    <TaskListPage
                        title="My Tasks"
                        fetchUrl="/api/tasks/my"
                        dateFilter={dateFilter}
                        hideHeader={true}
                        fetchParams={{
                            ...(filters.status ? { status_filter: filters.status } : {}),
                            ...(filters.priority ? { priority: filters.priority } : {}),
                            ...(filters.assignee ? { assignee_id: filters.assignee } : {}),
                            ...(filters.search ? { search: filters.search } : {}),
                        }}
                    />
                )}

                {view === "kanban" && !loading && (
                    <KanbanBoard
                        tasks={sortedTasks}
                        {...commonViewProps}
                        onAddForStatus={handleOpenAddForStatus}
                    />
                )}

                {view === "calendar" && !loading && (
                    <CalendarView
                        tasks={sortedTasks}
                        onTaskClick={handleTaskClick}
                        onDateClick={handleDateClick}
                        onEditTask={handleEditTask}
                        onDeleteTask={handleDeleteTask}
                        onTaskDateChange={handleTaskDateChange}
                    />
                )}

                {view === "gantt" && !loading && (
                    <GanttView
                        tasks={sortedTasks}
                        onTaskClick={(t) => handleTaskClick(t as Task)}
                        onEditTask={(t) => handleEditTask(t as Task)}
                        onDeleteTask={(t) => handleDeleteTask(t as Task)}
                        onTaskDateRangeChange={handleTaskDateRangeChange}
                    />
                )}

                {view === "swimlane" && !loading && (
                    <SwimlaneView
                        tasks={sortedTasks}
                        groupBy={(groupBy as "assignee" | "priority" | "status") || "assignee"}
                        {...commonViewProps}
                        onAddForLane={handleOpenAddForStatus}
                    />
                )}

                {loading && view !== "list" && (
                    <div className="flex items-center justify-center h-64 text-foreground/50 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-foreground/20 border-t-blue-400 rounded-full animate-spin" />
                            Loading tasks...
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Bulk Action Bar ─────────────────────────────────────────────── */}
            {view !== "list" && (
                <BulkActionBar
                    selectedCount={selectedTaskIds.size}
                    onClearSelection={() => setSelectedTaskIds(new Set())}
                    onBulkStatusChange={handleBulkStatusChange}
                    onBulkPriorityChange={handleBulkPriorityChange}
                    onBulkDelete={handleBulkDelete}
                />
            )}

            {/* ─── Modals ──────────────────────────────────────────────────────── */}
            <AddTaskModal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); setAddModalDefaultDate(undefined); setAddModalDefaultStatus(undefined); }}
                onTaskCreated={() => { fetchTasks(); showToast("Task created"); }}
            />

            <EditTaskModal
                isOpen={showEditModal}
                task={editTask as any}
                onClose={() => { setShowEditModal(false); setEditTask(null); }}
                onTaskUpdated={() => { fetchTasks(); showToast("Task updated"); }}
            />

            <DeleteTaskModal
                isOpen={showDeleteModal}
                taskName={deleteTask?.name || ""}
                taskStatus={deleteTask?.status || "todo"}
                onClose={() => { setShowDeleteModal(false); setDeleteTask(null); }}
                onConfirm={handleDeleteConfirm}
                isDeleting={isDeleting}
            />

            <DuplicateTaskModal
                isOpen={showDuplicateModal}
                taskName={duplicateTask?.name || ""}
                onClose={() => { setShowDuplicateModal(false); setDuplicateTask(null); }}
                onConfirm={handleDuplicateConfirm}
                isDuplicating={isDuplicating}
            />

            <CommentsModal
                isOpen={showCommentsModal}
                taskId={commentsTask?.id || null}
                taskName={commentsTask?.name || ""}
                onClose={() => { setShowCommentsModal(false); setCommentsTask(null); }}
            />

            {/* ─── Task Detail Panel ───────────────────────────────────────────── */}
            {detailTaskId && (
                <TaskDetailPanel
                    taskId={detailTaskId}
                    onClose={() => setDetailTaskId(null)}
                />
            )}

            {/* ─── Toast ───────────────────────────────────────────────────────── */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onDismiss={() => setToast(null)}
                />
            )}
        </div>
    );
}

export default function MyTasksPage() {
    return (
        <Suspense>
            <MyTasksContent />
        </Suspense>
    );
}
