"use client";

import { useState, useEffect } from "react";
import {
    Task,
    TaskUpdate,
    getTask,
    updateTask,
    getTaskComments,
    addTaskComment,
    TaskComment,
} from "@/services/tasks";

// =============== Icons ===============

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const UserIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const TagIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const SendIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

// =============== Types ===============

interface TaskDetailModalProps {
    taskId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdated?: (task: Task) => void;
}

// =============== Priority & Status Constants ===============

const priorities = [
    { value: "low", label: "Low", color: "bg-gray-500" },
    { value: "medium", label: "Medium", color: "bg-blue-500" },
    { value: "high", label: "High", color: "bg-orange-500" },
    { value: "urgent", label: "Urgent", color: "bg-red-500" },
];

const statuses = [
    { value: "backlog", label: "Backlog", color: "bg-gray-400" },
    { value: "todo", label: "To Do", color: "bg-blue-400" },
    { value: "in_progress", label: "In Progress", color: "bg-yellow-400" },
    { value: "review", label: "Review", color: "bg-purple-400" },
    { value: "completed", label: "Completed", color: "bg-emerald-400" },
    { value: "blocked", label: "Blocked", color: "bg-red-400" },
];

// =============== Sub-Components ===============

interface CommentItemProps {
    comment: TaskComment;
}

function CommentItem({ comment }: CommentItemProps) {
    const timeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <div className="flex gap-3 p-3 rounded-lg hover:bg-foreground/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                {comment.user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                        {comment.user?.full_name || "Unknown User"}
                    </span>
                    <span className="text-xs text-foreground/40">
                        {timeAgo(comment.created_at)}
                    </span>
                </div>
                <p className="text-sm text-foreground/70">{comment.content}</p>
                {comment.reactions && comment.reactions.length > 0 && (
                    <div className="flex gap-1 mt-2">
                        {comment.reactions.map((reaction, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full bg-foreground/10 text-xs"
                            >
                                {reaction.emoji} {reaction.count}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// =============== Main Component ===============

export function TaskDetailModal({ taskId, isOpen, onClose, onTaskUpdated }: TaskDetailModalProps) {
    const [task, setTask] = useState<Task | null>(null);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [activeTab, setActiveTab] = useState<"details" | "comments" | "activity">("details");

    // Editable fields
    const [editedName, setEditedName] = useState("");
    const [editedDescription, setEditedDescription] = useState("");
    const [editedPriority, setEditedPriority] = useState("");
    const [editedStatus, setEditedStatus] = useState("");
    const [editedDueDate, setEditedDueDate] = useState("");
    const [editedEstimatedHours, setEditedEstimatedHours] = useState("");

    useEffect(() => {
        if (!taskId || !isOpen) return;

        async function fetchTaskData() {
            setLoading(true);
            try {
                const [taskData, commentsData] = await Promise.all([
                    getTask(taskId!).catch(() => null),
                    getTaskComments(taskId!).catch(() => []),
                ]);

                if (taskData) {
                    setTask(taskData);
                    setEditedName(taskData.name);
                    setEditedDescription(taskData.description || "");
                    setEditedPriority(taskData.priority);
                    setEditedStatus(taskData.status);
                    setEditedDueDate(taskData.due_date?.split("T")[0] || "");
                    setEditedEstimatedHours(taskData.estimated_hours?.toString() || "");
                } else {
                    // Mock data for demo
                    const mockTask: Task = {
                        id: taskId!,
                        name: "Sample Task",
                        description: "This is a sample task description. You can edit this to add more details about the task.",
                        task_type: "project",
                        priority: "medium",
                        status: "in_progress",
                        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        estimated_hours: 8,
                        actual_hours: 3,
                        order: 1,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        tags: ["frontend", "ui"],
                        project: { id: "p1", name: "Main Project" },
                        assignee: { id: "u1", full_name: "John Doe", email: "john@example.com" },
                    };
                    setTask(mockTask);
                    setEditedName(mockTask.name);
                    setEditedDescription(mockTask.description || "");
                    setEditedPriority(mockTask.priority);
                    setEditedStatus(mockTask.status);
                    setEditedDueDate(mockTask.due_date?.split("T")[0] || "");
                    setEditedEstimatedHours(mockTask.estimated_hours?.toString() || "");
                }

                if (commentsData.length > 0) {
                    setComments(commentsData);
                } else {
                    // Mock comments
                    setComments([
                        {
                            id: "c1",
                            task_id: taskId!,
                            user_id: "u1",
                            content: "Started working on this task. Will update progress soon.",
                            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                            updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                            user: { id: "u1", full_name: "Jane Smith" },
                        },
                        {
                            id: "c2",
                            task_id: taskId!,
                            user_id: "u2",
                            content: "Looks good! Let me know if you need any help.",
                            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                            updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                            user: { id: "u2", full_name: "Bob Wilson" },
                        },
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch task:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchTaskData();
    }, [taskId, isOpen]);

    const handleSave = async () => {
        if (!task) return;

        setSaving(true);
        try {
            const updates: TaskUpdate = {
                name: editedName,
                description: editedDescription,
                priority: editedPriority as Task["priority"],
                status: editedStatus as Task["status"],
                due_date: editedDueDate || undefined,
                estimated_hours: editedEstimatedHours ? parseFloat(editedEstimatedHours) : undefined,
            };

            const updatedTask = await updateTask(task.id, updates);
            setTask(updatedTask);
            onTaskUpdated?.(updatedTask);
        } catch (error) {
            console.error("Failed to save task:", error);
            // Update locally for demo
            if (task) {
                const updated = {
                    ...task,
                    name: editedName,
                    description: editedDescription,
                    priority: editedPriority as Task["priority"],
                    status: editedStatus as Task["status"],
                    due_date: editedDueDate,
                    estimated_hours: editedEstimatedHours ? parseFloat(editedEstimatedHours) : undefined,
                };
                setTask(updated);
                onTaskUpdated?.(updated);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAddComment = async () => {
        if (!task || !newComment.trim()) return;

        try {
            const comment = await addTaskComment(task.id, newComment);
            setComments([...comments, comment]);
            setNewComment("");
        } catch (error) {
            console.error("Failed to add comment:", error);
            // Add mock comment for demo
            const mockComment: TaskComment = {
                id: `c${Date.now()}`,
                task_id: task.id,
                user_id: "current-user",
                content: newComment,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user: { id: "current-user", full_name: "You" },
            };
            setComments([...comments, mockComment]);
            setNewComment("");
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-4 md:inset-10 lg:inset-20 bg-background border border-foreground/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                    </div>
                ) : task ? (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
                            <div className="flex items-center gap-3">
                                <span
                                    className={`w-3 h-3 rounded-full ${statuses.find((s) => s.value === editedStatus)?.color || "bg-gray-400"
                                        }`}
                                />
                                <span className="text-sm text-foreground/50">{task.project?.name || "No Project"}</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden flex">
                            {/* Main Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {/* Task Name */}
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="w-full text-2xl font-bold text-foreground bg-transparent border-none outline-none mb-4"
                                    placeholder="Task name..."
                                />

                                {/* Tabs */}
                                <div className="flex gap-1 mb-6 border-b border-foreground/10">
                                    {(["details", "comments", "activity"] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab
                                                ? "text-blue-400 border-b-2 border-blue-400"
                                                : "text-foreground/60 hover:text-foreground"
                                                }`}
                                        >
                                            {tab}
                                            {tab === "comments" && comments.length > 0 && (
                                                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-foreground/10">
                                                    {comments.length}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                {activeTab === "details" && (
                                    <div className="space-y-6">
                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground/60 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={editedDescription}
                                                onChange={(e) => setEditedDescription(e.target.value)}
                                                rows={4}
                                                className="w-full px-4 py-3 bg-foreground/5 border border-foreground/10 rounded-xl text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                placeholder="Add a description..."
                                            />
                                        </div>

                                        {/* Subtasks Placeholder */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground/60 mb-2">
                                                Subtasks
                                            </label>
                                            <div className="p-4 border border-dashed border-foreground/20 rounded-xl text-center">
                                                <p className="text-sm text-foreground/40">No subtasks yet</p>
                                                <button className="mt-2 text-sm text-blue-400 hover:text-blue-300">
                                                    + Add subtask
                                                </button>
                                            </div>
                                        </div>

                                        {/* Attachments Placeholder */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground/60 mb-2">
                                                Attachments
                                            </label>
                                            <div className="p-4 border border-dashed border-foreground/20 rounded-xl text-center">
                                                <p className="text-sm text-foreground/40">No attachments</p>
                                                <button className="mt-2 text-sm text-blue-400 hover:text-blue-300">
                                                    + Add attachment
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "comments" && (
                                    <div className="space-y-4">
                                        {/* Comments List */}
                                        <div className="space-y-1">
                                            {comments.map((comment) => (
                                                <CommentItem key={comment.id} comment={comment} />
                                            ))}
                                            {comments.length === 0 && (
                                                <p className="text-center text-foreground/40 py-8">
                                                    No comments yet. Start the conversation!
                                                </p>
                                            )}
                                        </div>

                                        {/* Add Comment */}
                                        <div className="flex gap-3 pt-4 border-t border-foreground/10">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                                                Y
                                            </div>
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                                                    placeholder="Write a comment..."
                                                    className="flex-1 px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                />
                                                <button
                                                    onClick={handleAddComment}
                                                    disabled={!newComment.trim()}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                                >
                                                    <SendIcon />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "activity" && (
                                    <div className="space-y-4">
                                        <div className="relative pl-6 border-l-2 border-foreground/10 space-y-6">
                                            <div className="relative">
                                                <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-blue-500" />
                                                <p className="text-sm text-foreground">
                                                    <span className="font-medium">John Doe</span> changed status to{" "}
                                                    <span className="text-blue-400">In Progress</span>
                                                </p>
                                                <p className="text-xs text-foreground/40 mt-1">2 hours ago</p>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-purple-500" />
                                                <p className="text-sm text-foreground">
                                                    <span className="font-medium">Jane Smith</span> assigned to{" "}
                                                    <span className="text-purple-400">John Doe</span>
                                                </p>
                                                <p className="text-xs text-foreground/40 mt-1">5 hours ago</p>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-emerald-500" />
                                                <p className="text-sm text-foreground">
                                                    <span className="font-medium">System</span> created this task
                                                </p>
                                                <p className="text-xs text-foreground/40 mt-1">1 day ago</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar */}
                            <div className="w-80 border-l border-foreground/10 p-6 overflow-y-auto bg-foreground/[0.02]">
                                <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
                                    Properties
                                </h3>

                                <div className="space-y-4">
                                    {/* Status */}
                                    <div>
                                        <label className="flex items-center gap-2 text-xs text-foreground/50 mb-2">
                                            <CheckIcon /> Status
                                        </label>
                                        <select
                                            value={editedStatus}
                                            onChange={(e) => setEditedStatus(e.target.value)}
                                            className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        >
                                            {statuses.map((s) => (
                                                <option key={s.value} value={s.value}>
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="flex items-center gap-2 text-xs text-foreground/50 mb-2">
                                            <TagIcon /> Priority
                                        </label>
                                        <select
                                            value={editedPriority}
                                            onChange={(e) => setEditedPriority(e.target.value)}
                                            className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        >
                                            {priorities.map((p) => (
                                                <option key={p.value} value={p.value}>
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Assignee */}
                                    <div>
                                        <label className="flex items-center gap-2 text-xs text-foreground/50 mb-2">
                                            <UserIcon /> Assignee
                                        </label>
                                        <div className="flex items-center gap-2 px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg">
                                            {task.assignee ? (
                                                <>
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                                                        {task.assignee.full_name.charAt(0)}
                                                    </div>
                                                    <span className="text-sm text-foreground">{task.assignee.full_name}</span>
                                                </>
                                            ) : (
                                                <span className="text-sm text-foreground/40">Unassigned</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Due Date */}
                                    <div>
                                        <label className="flex items-center gap-2 text-xs text-foreground/50 mb-2">
                                            <CalendarIcon /> Due Date
                                        </label>
                                        <input
                                            type="date"
                                            value={editedDueDate}
                                            onChange={(e) => setEditedDueDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>

                                    {/* Estimated Hours */}
                                    <div>
                                        <label className="flex items-center gap-2 text-xs text-foreground/50 mb-2">
                                            <ClockIcon /> Estimated Hours
                                        </label>
                                        <input
                                            type="number"
                                            value={editedEstimatedHours}
                                            onChange={(e) => setEditedEstimatedHours(e.target.value)}
                                            placeholder="0"
                                            min="0"
                                            step="0.5"
                                            className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>

                                    {/* Time Logged */}
                                    <div>
                                        <label className="flex items-center gap-2 text-xs text-foreground/50 mb-2">
                                            <ClockIcon /> Time Logged
                                        </label>
                                        <div className="px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg">
                                            <span className="text-sm text-foreground">{task.actual_hours || 0}h</span>
                                            {task.estimated_hours && (
                                                <span className="text-sm text-foreground/40"> / {task.estimated_hours}h</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    {task.tags && task.tags.length > 0 && (
                                        <div>
                                            <label className="flex items-center gap-2 text-xs text-foreground/50 mb-2">
                                                <TagIcon /> Tags
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {task.tags.map((tag, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-1 text-xs rounded-full bg-foreground/10 text-foreground/70"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-foreground/10 bg-foreground/[0.02]">
                            <div className="text-xs text-foreground/40">
                                Created {new Date(task.created_at).toLocaleDateString()} • Updated{" "}
                                {new Date(task.updated_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-foreground/50">Task not found</p>
                    </div>
                )}
            </div>
        </>
    );
}
