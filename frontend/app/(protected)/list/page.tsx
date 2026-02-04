"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// =============== Types ===============

interface Task {
    id: string;
    name: string;
    description?: string;
    status: "backlog" | "todo" | "in_progress" | "review" | "done";
    priority: "low" | "medium" | "high" | "critical";
    dueDate?: string;
    assignee?: {
        id: string;
        name: string;
        avatar?: string;
    };
    project?: {
        id: string;
        name: string;
        color: string;
    };
    tags: string[];
    createdAt: string;
    estimatedHours?: number;
}

type SortField = "name" | "status" | "priority" | "dueDate" | "assignee" | "project";
type SortDirection = "asc" | "desc";

// =============== Icons ===============

const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const FilterIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const SortIcon = ({ direction }: { direction?: SortDirection }) => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {direction === "asc" ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : direction === "desc" ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        )}
    </svg>
);

const CheckboxIcon = ({ checked }: { checked: boolean }) => (
    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? "bg-blue-600 border-blue-600" : "border-foreground/30 hover:border-foreground/50"
        }`}>
        {checked && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
        )}
    </div>
);

const MoreIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
);

// =============== Mock Data ===============

const generateMockTasks = (): Task[] => {
    const statuses: Task["status"][] = ["backlog", "todo", "in_progress", "review", "done"];
    const priorities: Task["priority"][] = ["low", "medium", "high", "critical"];
    const projects = [
        { id: "p1", name: "Website Redesign", color: "#3b82f6" },
        { id: "p2", name: "Mobile App", color: "#8b5cf6" },
        { id: "p3", name: "API Gateway", color: "#10b981" },
    ];
    const assignees = [
        { id: "u1", name: "Alice Johnson" },
        { id: "u2", name: "Bob Smith" },
        { id: "u3", name: "Charlie Brown" },
        { id: "u4", name: "Diana Prince" },
    ];
    const tagOptions = ["frontend", "backend", "design", "bug", "feature", "urgent"];

    const tasks: Task[] = [];
    const taskNames = [
        "Implement user authentication",
        "Design landing page",
        "Set up CI/CD pipeline",
        "Create API documentation",
        "Fix navigation bug",
        "Add dark mode support",
        "Optimize database queries",
        "Write unit tests",
        "Update dependencies",
        "Implement search functionality",
        "Design user profile page",
        "Create onboarding flow",
        "Fix responsive layout",
        "Add analytics tracking",
        "Implement notifications",
    ];

    for (let i = 0; i < taskNames.length; i++) {
        const daysOffset = Math.floor(Math.random() * 30) - 10;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + daysOffset);

        tasks.push({
            id: `task-${i}`,
            name: taskNames[i],
            description: `Description for ${taskNames[i]}`,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            dueDate: dueDate.toISOString().split("T")[0],
            assignee: assignees[Math.floor(Math.random() * assignees.length)],
            project: projects[Math.floor(Math.random() * projects.length)],
            tags: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () =>
                tagOptions[Math.floor(Math.random() * tagOptions.length)]
            ).filter((v, i, a) => a.indexOf(v) === i),
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            estimatedHours: Math.floor(Math.random() * 20) + 1,
        });
    }

    return tasks;
};

// =============== Helper Functions ===============

const statusConfig = {
    backlog: { label: "Backlog", color: "bg-gray-500", textColor: "text-gray-400" },
    todo: { label: "To Do", color: "bg-blue-500", textColor: "text-blue-400" },
    in_progress: { label: "In Progress", color: "bg-purple-500", textColor: "text-purple-400" },
    review: { label: "Review", color: "bg-amber-500", textColor: "text-amber-400" },
    done: { label: "Done", color: "bg-emerald-500", textColor: "text-emerald-400" },
};

const priorityConfig = {
    low: { label: "Low", color: "bg-gray-500/20 text-gray-400" },
    medium: { label: "Medium", color: "bg-blue-500/20 text-blue-400" },
    high: { label: "High", color: "bg-orange-500/20 text-orange-400" },
    critical: { label: "Critical", color: "bg-red-500/20 text-red-400" },
};

const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `${diffDays}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// =============== Components ===============

interface TableHeaderProps {
    field: SortField;
    label: string;
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;
    className?: string;
}

function TableHeader({ field, label, sortField, sortDirection, onSort, className = "" }: TableHeaderProps) {
    const isActive = sortField === field;

    return (
        <th
            className={`px-4 py-3 text-left text-sm font-medium text-foreground/60 cursor-pointer hover:text-foreground transition-colors ${className}`}
            onClick={() => onSort(field)}
        >
            <div className="flex items-center gap-1">
                {label}
                <SortIcon direction={isActive ? sortDirection : undefined} />
            </div>
        </th>
    );
}

interface TaskRowProps {
    task: Task;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onTaskClick: (task: Task) => void;
}

function TaskRow({ task, isSelected, onSelect, onTaskClick }: TaskRowProps) {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

    return (
        <tr
            className={`border-b border-foreground/5 hover:bg-foreground/[0.02] transition-colors cursor-pointer ${isSelected ? "bg-blue-500/10" : ""
                }`}
        >
            {/* Checkbox */}
            <td className="px-4 py-3 w-12">
                <button onClick={(e) => { e.stopPropagation(); onSelect(task.id); }}>
                    <CheckboxIcon checked={isSelected} />
                </button>
            </td>

            {/* Task Name */}
            <td className="px-4 py-3" onClick={() => onTaskClick(task)}>
                <div className="flex items-center gap-3">
                    {task.project && (
                        <div
                            className="w-1 h-8 rounded-full"
                            style={{ backgroundColor: task.project.color }}
                        />
                    )}
                    <div>
                        <p className={`font-medium ${task.status === "done" ? "text-foreground/40 line-through" : "text-foreground"}`}>
                            {task.name}
                        </p>
                        {task.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                                {task.tags.slice(0, 2).map(tag => (
                                    <span
                                        key={tag}
                                        className="px-1.5 py-0.5 bg-foreground/10 rounded text-xs text-foreground/50"
                                    >
                                        {tag}
                                    </span>
                                ))}
                                {task.tags.length > 2 && (
                                    <span className="text-xs text-foreground/40">+{task.tags.length - 2}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </td>

            {/* Status */}
            <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[task.status].color}/20 ${statusConfig[task.status].textColor}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusConfig[task.status].color}`} />
                    {statusConfig[task.status].label}
                </span>
            </td>

            {/* Priority */}
            <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${priorityConfig[task.priority].color}`}>
                    {priorityConfig[task.priority].label}
                </span>
            </td>

            {/* Due Date */}
            <td className="px-4 py-3">
                <span className={`text-sm ${isOverdue ? "text-red-400 font-medium" : "text-foreground/60"}`}>
                    {formatDate(task.dueDate)}
                </span>
            </td>

            {/* Assignee */}
            <td className="px-4 py-3">
                {task.assignee ? (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                            {task.assignee.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="text-sm text-foreground/70">{task.assignee.name.split(" ")[0]}</span>
                    </div>
                ) : (
                    <span className="text-sm text-foreground/40">Unassigned</span>
                )}
            </td>

            {/* Project */}
            <td className="px-4 py-3">
                {task.project && (
                    <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ backgroundColor: `${task.project.color}20`, color: task.project.color }}
                    >
                        {task.project.name}
                    </span>
                )}
            </td>

            {/* Actions */}
            <td className="px-4 py-3 w-12">
                <button className="p-1 text-foreground/40 hover:text-foreground rounded transition-colors">
                    <MoreIcon />
                </button>
            </td>
        </tr>
    );
}

// =============== Main Component ===============

export default function ListViewPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [sortField, setSortField] = useState<SortField>("dueDate");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [statusFilter, setStatusFilter] = useState<Task["status"] | "all">("all");
    const [priorityFilter, setPriorityFilter] = useState<Task["priority"] | "all">("all");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setTasks(generateMockTasks());
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Filter and sort tasks
    const filteredTasks = useMemo(() => {
        let result = [...tasks];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.name.toLowerCase().includes(query) ||
                t.tags.some(tag => tag.toLowerCase().includes(query)) ||
                t.assignee?.name.toLowerCase().includes(query) ||
                t.project?.name.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== "all") {
            result = result.filter(t => t.status === statusFilter);
        }

        // Priority filter
        if (priorityFilter !== "all") {
            result = result.filter(t => t.priority === priorityFilter);
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case "name":
                    comparison = a.name.localeCompare(b.name);
                    break;
                case "status":
                    const statusOrder = ["backlog", "todo", "in_progress", "review", "done"];
                    comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
                    break;
                case "priority":
                    const priorityOrder = ["critical", "high", "medium", "low"];
                    comparison = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
                    break;
                case "dueDate":
                    comparison = (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
                    break;
                case "assignee":
                    comparison = (a.assignee?.name || "ZZZ").localeCompare(b.assignee?.name || "ZZZ");
                    break;
                case "project":
                    comparison = (a.project?.name || "ZZZ").localeCompare(b.project?.name || "ZZZ");
                    break;
            }
            return sortDirection === "asc" ? comparison : -comparison;
        });

        return result;
    }, [tasks, searchQuery, statusFilter, priorityFilter, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedTasks(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedTasks.size === filteredTasks.length) {
            setSelectedTasks(new Set());
        } else {
            setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Task List</h1>
                        <p className="text-foreground/60 mt-1">
                            {filteredTasks.length} tasks {statusFilter !== "all" && `• ${statusConfig[statusFilter].label}`}
                        </p>
                    </div>

                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                        + New Task
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="flex-1 min-w-64 relative">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Search tasks, tags, assignees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">
                            <SearchIcon />
                        </div>
                    </div>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as Task["status"] | "all")}
                        className="px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        <option value="all">All Statuses</option>
                        {Object.entries(statusConfig).map(([value, config]) => (
                            <option key={value} value={value}>{config.label}</option>
                        ))}
                    </select>

                    {/* Priority filter */}
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as Task["priority"] | "all")}
                        className="px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        <option value="all">All Priorities</option>
                        {Object.entries(priorityConfig).map(([value, config]) => (
                            <option key={value} value={value}>{config.label}</option>
                        ))}
                    </select>

                    {/* Bulk actions */}
                    {selectedTasks.size > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <span className="text-sm text-blue-400">{selectedTasks.size} selected</span>
                            <button className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                                Bulk Edit
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-background border border-foreground/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-foreground/[0.02] border-b border-foreground/10">
                                <tr>
                                    <th className="px-4 py-3 w-12">
                                        <button onClick={toggleSelectAll}>
                                            <CheckboxIcon checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0} />
                                        </button>
                                    </th>
                                    <TableHeader field="name" label="Task" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="min-w-64" />
                                    <TableHeader field="status" label="Status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                                    <TableHeader field="priority" label="Priority" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                                    <TableHeader field="dueDate" label="Due Date" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                                    <TableHeader field="assignee" label="Assignee" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                                    <TableHeader field="project" label="Project" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                                    <th className="px-4 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        isSelected={selectedTasks.has(task.id)}
                                        onSelect={toggleSelect}
                                        onTaskClick={setSelectedTask}
                                    />
                                ))}
                            </tbody>
                        </table>

                        {filteredTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-foreground/40">
                                <FilterIcon />
                                <p className="mt-2">No tasks match your filters</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination info */}
                <div className="flex items-center justify-between text-sm text-foreground/50">
                    <span>Showing {filteredTasks.length} of {tasks.length} tasks</span>
                    <div className="flex items-center gap-2">
                        <span>Rows per page:</span>
                        <select className="bg-foreground/5 border border-foreground/10 rounded px-2 py-1 text-foreground">
                            <option>15</option>
                            <option>25</option>
                            <option>50</option>
                        </select>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
