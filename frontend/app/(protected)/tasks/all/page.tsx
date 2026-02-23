"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus } from "lucide-react";
import { getToken } from "@/lib/auth";
import { ViewSwitcher, ViewToolbar, type ViewType, type FilterState } from "@/components/views/ViewSwitcher";
import KanbanBoard from "@/components/views/KanbanBoard";
import CalendarView from "@/components/views/CalendarView";
import GanttView from "@/components/views/GanttView";
import SwimlaneView from "@/components/views/SwimlaneView";
import TaskListPage from "@/components/TaskListPage";

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

// ─── Multi-View Tasks Page ────────────────────────────────────────────────────

export default function AllTasksPage() {
    const [view, setView] = useState<ViewType>(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("tasks_view") as ViewType) || "list";
        }
        return "list";
    });

    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<FilterState>({ status: "", priority: "", assignee: "", search: "" });
    const [sortBy, setSortBy] = useState("due_date");
    const [groupBy, setGroupBy] = useState("");

    // Persist view selection
    const handleViewChange = (v: ViewType) => {
        setView(v);
        localStorage.setItem("tasks_view", v);
    };

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.status) params.set("status_filter", filters.status);
            if (filters.priority) params.set("priority", filters.priority);
            if (filters.assignee) params.set("assignee_id", filters.assignee);
            if (filters.search) params.set("search", filters.search);
            params.set("limit", "200");
            const data = await apiFetch(`/tasks?${params.toString()}`);
            setTasks(data || []);
        } catch {
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        // Only fetch ourselves for non-list views (list view has its own fetching)
        if (view !== "list") {
            fetchTasks();
        }
    }, [view, fetchTasks]);

    useEffect(() => {
        apiFetch("/api/users?limit=100").then((d) => setUsers(d || [])).catch(() => { });
    }, []);

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        try {
            await apiFetch(`/tasks/${taskId}`, {
                method: "PUT",
                body: JSON.stringify({ status: newStatus }),
            });
            setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
        } catch (err: any) {
            alert(`Cannot update: ${err.message}`);
        }
    };

    const handleTaskClick = (task: Task) => {
        // Open task detail — using native browser alert as placeholder
        // TODO: wire to TaskDetailPanel or EditTaskModal
        console.log("Task clicked:", task.id);
    };

    const handleDateClick = (date: Date) => {
        // TODO: open AddTaskModal with pre-filled due_date
        console.log("Date clicked:", date.toISOString().split("T")[0]);
    };

    // Sort tasks client-side
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

    return (
        <div className="flex flex-col h-full min-h-screen bg-slate-950 text-slate-200 p-4 gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold">My Tasks</h1>
                    {view !== "list" && (
                        <p className="text-sm text-slate-500 mt-0.5">
                            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                            {filters.status || filters.priority || filters.search ? " (filtered)" : ""}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <ViewSwitcher
                        currentView={view}
                        onChange={handleViewChange}
                        onSaveView={() => alert("Save view — connect to /api/views")}
                        onShareView={() => alert("Share view — connect to /api/views/{id}/share")}
                    />
                    <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
                        <Plus size={15} /> New Task
                    </button>
                </div>
            </div>

            {/* Toolbar (not shown for list view which has its own filters) */}
            {view !== "list" && (
                <ViewToolbar
                    filters={filters}
                    onFiltersChange={setFilters}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    groupBy={groupBy}
                    onGroupChange={setGroupBy}
                    users={users}
                />
            )}

            {/* View Content */}
            <div className="flex-1 overflow-hidden">
                {view === "list" && (
                    <TaskListPage title="My Tasks" fetchUrl="/api/tasks/my" />
                )}

                {view === "kanban" && !loading && (
                    <KanbanBoard
                        tasks={sortedTasks}
                        onStatusChange={handleStatusChange}
                        onTaskClick={handleTaskClick}
                    />
                )}

                {view === "calendar" && !loading && (
                    <CalendarView
                        tasks={sortedTasks}
                        onTaskClick={handleTaskClick}
                        onDateClick={handleDateClick}
                    />
                )}

                {view === "gantt" && !loading && (
                    <GanttView
                        tasks={sortedTasks}
                        onTaskClick={handleTaskClick}
                    />
                )}

                {view === "swimlane" && !loading && (
                    <SwimlaneView
                        tasks={sortedTasks}
                        groupBy={(groupBy as "assignee" | "priority" | "status") || "assignee"}
                        onTaskClick={handleTaskClick}
                        onStatusChange={handleStatusChange}
                    />
                )}

                {loading && view !== "list" && (
                    <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
                        Loading tasks...
                    </div>
                )}
            </div>
        </div>
    );
}
