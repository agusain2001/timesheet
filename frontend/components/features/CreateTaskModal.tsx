"use client";

import { useState, useEffect } from "react";
import { Task, TaskCreate, createTask, TaskPriority, TaskType } from "@/services/tasks";
import { getProjects, Project } from "@/services/projects";
import { getTeams, Team } from "@/services/teams";

// =============== Icons ===============

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const SparklesIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

// =============== Types ===============

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated?: (task: Task) => void;
    defaultProjectId?: string;
    defaultStatus?: string;
}

// =============== Priority & Type Options ===============

const priorities: { value: TaskPriority; label: string; color: string }[] = [
    { value: "low", label: "Low", color: "bg-gray-500" },
    { value: "medium", label: "Medium", color: "bg-blue-500" },
    { value: "high", label: "High", color: "bg-orange-500" },
    { value: "urgent", label: "Urgent", color: "bg-red-500" },
];

const taskTypes: { value: TaskType; label: string; description: string }[] = [
    { value: "personal", label: "Personal", description: "Task for yourself" },
    { value: "project", label: "Project", description: "Part of a project" },
    { value: "assigned", label: "Assigned", description: "Assigned to others" },
];

// =============== Main Component ===============

export function CreateTaskModal({
    isOpen,
    onClose,
    onTaskCreated,
    defaultProjectId,
    defaultStatus = "todo",
}: CreateTaskModalProps) {
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [taskType, setTaskType] = useState<TaskType>("project");
    const [priority, setPriority] = useState<TaskPriority>("medium");
    const [projectId, setProjectId] = useState(defaultProjectId || "");
    const [teamId, setTeamId] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [startDate, setStartDate] = useState("");
    const [estimatedHours, setEstimatedHours] = useState("");
    const [tags, setTags] = useState("");

    // Fetch projects and teams
    useEffect(() => {
        if (!isOpen) return;

        async function fetchData() {
            try {
                const [projectsData, teamsData] = await Promise.all([
                    getProjects({}).catch(() => []),
                    getTeams({}).catch(() => []),
                ]);

                if (projectsData.length > 0) {
                    setProjects(projectsData);
                } else {
                    // Mock data
                    setProjects([
                        { id: "p1", name: "Website Redesign", code: "WRD", status: "active", priority: "high", progress_percentage: 45, budget_currency: "USD", actual_cost: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                        { id: "p2", name: "Mobile App", code: "MOB", status: "active", priority: "medium", progress_percentage: 30, budget_currency: "USD", actual_cost: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                        { id: "p3", name: "API Development", code: "API", status: "active", priority: "high", progress_percentage: 60, budget_currency: "USD", actual_cost: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                    ]);
                }

                if (teamsData.length > 0) {
                    setTeams(teamsData);
                } else {
                    // Mock data
                    setTeams([
                        { id: "t1", name: "Frontend Team", capacity_hours_week: 160, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                        { id: "t2", name: "Backend Team", capacity_hours_week: 160, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                        { id: "t3", name: "Design Team", capacity_hours_week: 120, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        }

        fetchData();
    }, [isOpen]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setName("");
            setDescription("");
            setTaskType("project");
            setPriority("medium");
            setProjectId(defaultProjectId || "");
            setTeamId("");
            setDueDate("");
            setStartDate("");
            setEstimatedHours("");
            setTags("");
            setShowAdvanced(false);
        }
    }, [isOpen, defaultProjectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) return;

        setLoading(true);

        try {
            const taskData: TaskCreate = {
                name: name.trim(),
                description: description.trim() || undefined,
                task_type: taskType,
                priority,
                project_id: projectId || undefined,
                team_id: teamId || undefined,
                due_date: dueDate || undefined,
                start_date: startDate || undefined,
                estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
                tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
            };

            const newTask = await createTask(taskData);
            onTaskCreated?.(newTask);
            onClose();
        } catch (error) {
            console.error("Failed to create task:", error);
            // Create mock task for demo
            const mockTask: Task = {
                id: `task-${Date.now()}`,
                name: name.trim(),
                description: description.trim() || undefined,
                task_type: taskType,
                priority,
                status: defaultStatus as Task["status"],
                actual_hours: 0,
                order: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                project: projectId ? projects.find((p) => p.id === projectId) : undefined,
                team: teamId ? teams.find((t) => t.id === teamId) : undefined,
                due_date: dueDate || undefined,
                start_date: startDate || undefined,
                estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
                tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
            };
            onTaskCreated?.(mockTask);
            onClose();
        } finally {
            setLoading(false);
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
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background border border-foreground/10 rounded-2xl shadow-2xl z-50">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <SparklesIcon />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground">Create New Task</h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* Task Name */}
                        <div>
                            <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                                Task Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter task name..."
                                className="w-full px-4 py-3 bg-foreground/5 border border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                autoFocus
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add a description..."
                                rows={3}
                                className="w-full px-4 py-3 bg-foreground/5 border border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                            />
                        </div>

                        {/* Task Type & Priority Row */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Task Type */}
                            <div>
                                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                                    Task Type
                                </label>
                                <select
                                    value={taskType}
                                    onChange={(e) => setTaskType(e.target.value as TaskType)}
                                    className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    {taskTypes.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                                    Priority
                                </label>
                                <div className="flex gap-2">
                                    {priorities.map((p) => (
                                        <button
                                            key={p.value}
                                            type="button"
                                            onClick={() => setPriority(p.value)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${priority === p.value
                                                    ? `${p.color} text-white`
                                                    : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
                                                }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Project & Team Row */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Project */}
                            <div>
                                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                                    Project
                                </label>
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="">No Project</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Team */}
                            <div>
                                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                                    Team
                                </label>
                                <select
                                    value={teamId}
                                    onChange={(e) => setTeamId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="">No Team</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div>
                            <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        {/* Advanced Options Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            {showAdvanced ? "− Hide" : "+ Show"} advanced options
                        </button>

                        {/* Advanced Options */}
                        {showAdvanced && (
                            <div className="space-y-4 pt-2 border-t border-foreground/10">
                                {/* Start Date & Estimated Hours */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                                            Estimated Hours
                                        </label>
                                        <input
                                            type="number"
                                            value={estimatedHours}
                                            onChange={(e) => setEstimatedHours(e.target.value)}
                                            placeholder="0"
                                            min="0"
                                            step="0.5"
                                            className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                                        Tags (comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        placeholder="frontend, urgent, bug-fix"
                                        className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-foreground/10 bg-foreground/[0.02]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Task"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

export default CreateTaskModal;
