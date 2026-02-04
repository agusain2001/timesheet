"use client";

import { useState, useEffect, useCallback } from "react";
import { getTasks, updateTaskStatus, Task, TaskStatus } from "@/services/tasks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CreateTaskModal } from "@/components/features/CreateTaskModal";
import { TaskDetailModal } from "@/components/features/TaskDetailModal";

// =============== Types ===============

interface Column {
    id: TaskStatus;
    title: string;
    color: string;
    tasks: Task[];
}

// =============== Icons ===============

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const DotsIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CommentIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const AttachmentIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
);

// =============== Components ===============

interface TaskCardProps {
    task: Task;
    onDragStart: (e: React.DragEvent, task: Task) => void;
    onClick: (task: Task) => void;
}

function TaskCard({ task, onDragStart, onClick }: TaskCardProps) {
    const priorityColors: Record<string, string> = {
        urgent: "bg-red-500",
        high: "bg-orange-500",
        medium: "bg-blue-500",
        low: "bg-gray-500",
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            onClick={() => onClick(task)}
            className="group bg-background border border-foreground/10 rounded-lg p-3 cursor-pointer 
                       hover:border-foreground/20 hover:shadow-lg hover:shadow-black/20 
                       transition-all duration-200 active:scale-[0.98]"
        >
            {/* Priority & Project */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority] || priorityColors.medium}`} />
                    {task.project && (
                        <span className="text-xs text-foreground/50 font-medium">
                            {task.project.name}
                        </span>
                    )}
                </div>
                <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-foreground/10 rounded transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Open task menu
                    }}
                >
                    <DotsIcon />
                </button>
            </div>

            {/* Task Name */}
            <h4 className="text-sm font-medium text-foreground mb-2 line-clamp-2">{task.name}</h4>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {task.tags.slice(0, 3).map((tag, i) => (
                        <span
                            key={i}
                            className="px-2 py-0.5 text-xs rounded-full bg-foreground/10 text-foreground/60"
                        >
                            {tag}
                        </span>
                    ))}
                    {task.tags.length > 3 && (
                        <span className="text-xs text-foreground/40">+{task.tags.length - 3}</span>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-foreground/5">
                <div className="flex items-center gap-3">
                    {/* Due Date */}
                    {task.due_date && (
                        <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-400" : "text-foreground/50"}`}>
                            <ClockIcon />
                            {formatDate(task.due_date)}
                        </span>
                    )}
                    {/* Comments */}
                    {task.comment_count && task.comment_count > 0 && (
                        <span className="flex items-center gap-1 text-xs text-foreground/50">
                            <CommentIcon />
                            {task.comment_count}
                        </span>
                    )}
                    {/* Attachments */}
                    {task.attachment_count && task.attachment_count > 0 && (
                        <span className="flex items-center gap-1 text-xs text-foreground/50">
                            <AttachmentIcon />
                            {task.attachment_count}
                        </span>
                    )}
                </div>

                {/* Assignee */}
                {task.assignee && (
                    <div className="flex items-center">
                        {task.assignee.avatar_url ? (
                            <img
                                src={task.assignee.avatar_url}
                                alt={task.assignee.full_name}
                                className="w-6 h-6 rounded-full border-2 border-background"
                            />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white border-2 border-background">
                                {task.assignee.full_name.charAt(0)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

interface KanbanColumnProps {
    column: Column;
    onDragStart: (e: React.DragEvent, task: Task) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, columnId: TaskStatus) => void;
    onTaskClick: (task: Task) => void;
    onAddTask: (columnId: TaskStatus) => void;
}

function KanbanColumn({
    column,
    onDragStart,
    onDragOver,
    onDrop,
    onTaskClick,
    onAddTask,
}: KanbanColumnProps) {
    const [isOver, setIsOver] = useState(false);

    return (
        <div
            className={`flex flex-col min-w-[280px] max-w-[320px] rounded-xl transition-colors ${isOver ? "bg-foreground/10" : "bg-foreground/5"
                }`}
            onDragOver={(e) => {
                e.preventDefault();
                setIsOver(true);
                onDragOver(e);
            }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => {
                setIsOver(false);
                onDrop(e, column.id);
            }}
        >
            {/* Column Header */}
            <div className="flex items-center justify-between p-3 border-b border-foreground/10">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h3 className="font-medium text-foreground">{column.title}</h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-foreground/10 text-foreground/60">
                        {column.tasks.length}
                    </span>
                </div>
                <button
                    onClick={() => onAddTask(column.id)}
                    className="p-1 hover:bg-foreground/10 rounded transition-colors text-foreground/60 hover:text-foreground"
                >
                    <PlusIcon />
                </button>
            </div>

            {/* Tasks */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
                {column.tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onDragStart={onDragStart}
                        onClick={onTaskClick}
                    />
                ))}

                {column.tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-foreground/30">
                        <p className="text-sm">No tasks</p>
                        <button
                            onClick={() => onAddTask(column.id)}
                            className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            + Add a task
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// =============== Main Component ===============

export default function KanbanPage() {
    const [columns, setColumns] = useState<Column[]>([
        { id: "backlog", title: "Backlog", color: "bg-gray-500", tasks: [] },
        { id: "todo", title: "To Do", color: "bg-blue-500", tasks: [] },
        { id: "in_progress", title: "In Progress", color: "bg-purple-500", tasks: [] },
        { id: "review", title: "Review", color: "bg-amber-500", tasks: [] },
        { id: "completed", title: "Completed", color: "bg-emerald-500", tasks: [] },
    ]);
    const [loading, setLoading] = useState(true);
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createModalDefaultStatus, setCreateModalDefaultStatus] = useState<TaskStatus>("todo");

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const tasks = await getTasks({ include_subtasks: false });

            // Group tasks by status
            const tasksByStatus: Record<string, Task[]> = {};
            tasks.forEach((task) => {
                const status = task.status || "todo";
                if (!tasksByStatus[status]) {
                    tasksByStatus[status] = [];
                }
                tasksByStatus[status].push(task);
            });

            // Update columns with tasks
            setColumns((prevColumns) =>
                prevColumns.map((col) => ({
                    ...col,
                    tasks: tasksByStatus[col.id] || [],
                }))
            );
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            // Set mock data for demo
            setColumns([
                {
                    id: "backlog", title: "Backlog", color: "bg-gray-500", tasks: [
                        { id: "1", name: "Research competitor features", priority: "low", status: "backlog", tags: ["research"], project: { id: "p1", name: "Product", code: "PRD" } } as Task,
                        { id: "2", name: "Update documentation", priority: "medium", status: "backlog", project: { id: "p1", name: "Product", code: "PRD" } } as Task,
                    ]
                },
                {
                    id: "todo", title: "To Do", color: "bg-blue-500", tasks: [
                        { id: "3", name: "Design new dashboard layout", priority: "high", status: "todo", due_date: new Date(Date.now() + 172800000).toISOString(), tags: ["design", "ui"], assignee: { id: "u1", full_name: "John Doe", email: "john@example.com" }, project: { id: "p2", name: "Frontend", code: "FE" } } as Task,
                        { id: "4", name: "Implement user settings page", priority: "medium", status: "todo", due_date: new Date(Date.now() + 345600000).toISOString(), comment_count: 3, assignee: { id: "u2", full_name: "Jane Smith", email: "jane@example.com" } } as Task,
                    ]
                },
                {
                    id: "in_progress", title: "In Progress", color: "bg-purple-500", tasks: [
                        { id: "5", name: "Build Kanban board component", priority: "urgent", status: "in_progress", due_date: new Date(Date.now() + 86400000).toISOString(), assignee: { id: "u1", full_name: "John Doe", email: "john@example.com" }, attachment_count: 2, project: { id: "p2", name: "Frontend", code: "FE" } } as Task,
                        { id: "6", name: "API integration for tasks", priority: "high", status: "in_progress", comment_count: 5, assignee: { id: "u2", full_name: "Jane Smith", email: "jane@example.com" } } as Task,
                    ]
                },
                {
                    id: "review", title: "Review", color: "bg-amber-500", tasks: [
                        { id: "7", name: "Review PR #42 - Auth improvements", priority: "high", status: "review", assignee: { id: "u3", full_name: "Bob Wilson", email: "bob@example.com" }, comment_count: 8 } as Task,
                    ]
                },
                {
                    id: "completed", title: "Completed", color: "bg-emerald-500", tasks: [
                        { id: "8", name: "Setup project structure", priority: "medium", status: "completed", assignee: { id: "u1", full_name: "John Doe", email: "john@example.com" } } as Task,
                        { id: "9", name: "Configure Tailwind CSS", priority: "low", status: "completed" } as Task,
                    ]
                },
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, targetColumnId: TaskStatus) => {
        e.preventDefault();
        if (!draggedTask) return;

        // Don't do anything if dropping in the same column
        if (draggedTask.status === targetColumnId) {
            setDraggedTask(null);
            return;
        }

        // Optimistic update
        setColumns((prevColumns) =>
            prevColumns.map((col) => {
                if (col.id === draggedTask.status) {
                    return {
                        ...col,
                        tasks: col.tasks.filter((t) => t.id !== draggedTask.id),
                    };
                }
                if (col.id === targetColumnId) {
                    return {
                        ...col,
                        tasks: [...col.tasks, { ...draggedTask, status: targetColumnId }],
                    };
                }
                return col;
            })
        );

        // Update on server
        try {
            await updateTaskStatus(draggedTask.id, targetColumnId);
        } catch (error) {
            console.error("Failed to update task status:", error);
            // Revert on error
            fetchTasks();
        }

        setDraggedTask(null);
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
    };

    const handleAddTask = (columnId: TaskStatus) => {
        setCreateModalDefaultStatus(columnId);
        setIsCreateModalOpen(true);
    };

    const handleTaskCreated = (newTask: Task) => {
        const status = newTask.status || createModalDefaultStatus;
        setColumns((prevColumns) =>
            prevColumns.map((col) =>
                col.id === status
                    ? { ...col, tasks: [...col.tasks, newTask] }
                    : col
            )
        );
    };

    const handleTaskUpdated = (updatedTask: Task) => {
        setColumns((prevColumns) =>
            prevColumns.map((col) => ({
                ...col,
                tasks: col.tasks.map((t) =>
                    t.id === updatedTask.id ? updatedTask : t
                ),
            }))
        );
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Kanban Board</h1>
                        <p className="text-foreground/60 mt-1">Drag and drop tasks to update their status</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select className="px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">All Projects</option>
                            <option value="p1">Product</option>
                            <option value="p2">Frontend</option>
                            <option value="p3">Backend</option>
                        </select>
                        <select className="px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">All Assignees</option>
                            <option value="me">My Tasks</option>
                        </select>
                        <button
                            onClick={() => {
                                setCreateModalDefaultStatus("todo");
                                setIsCreateModalOpen(true);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <PlusIcon />
                            Add Task
                        </button>
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-4 h-full min-w-max">
                        {columns.map((column) => (
                            <KanbanColumn
                                key={column.id}
                                column={column}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onTaskClick={handleTaskClick}
                                onAddTask={handleAddTask}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Create Task Modal */}
            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onTaskCreated={handleTaskCreated}
                defaultStatus={createModalDefaultStatus}
            />

            {/* Task Detail Modal */}
            <TaskDetailModal
                isOpen={!!selectedTask}
                taskId={selectedTask?.id || null}
                onClose={() => setSelectedTask(null)}
                onTaskUpdated={handleTaskUpdated}
            />
        </DashboardLayout>
    );
}
