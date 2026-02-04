"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// =============== Types ===============

interface Task {
    id: string;
    name: string;
    status: "backlog" | "todo" | "in_progress" | "review" | "done";
    priority: "low" | "medium" | "high" | "critical";
    dueDate?: string;
    estimatedHours?: number;
}

interface SwimLane {
    id: string;
    type: "user" | "team" | "project";
    name: string;
    avatar?: string;
    color?: string;
    tasks: Task[];
    capacity?: number;
}

type GroupBy = "user" | "team" | "project";

// =============== Icons ===============

const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const TeamIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const FolderIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const CollapseIcon = ({ expanded }: { expanded: boolean }) => (
    <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

// =============== Mock Data ===============

const generateMockData = (groupBy: GroupBy): SwimLane[] => {
    const statuses: Task["status"][] = ["backlog", "todo", "in_progress", "review", "done"];
    const priorities: Task["priority"][] = ["low", "medium", "high", "critical"];

    const generateTasks = (count: number): Task[] => {
        const taskNames = [
            "Implement login form", "Fix navigation bug", "Update API docs",
            "Design dashboard", "Write unit tests", "Optimize queries",
            "Create user profile", "Add dark mode", "Setup CI/CD",
        ];
        return Array.from({ length: count }, (_, i) => ({
            id: `task-${Math.random().toString(36).substr(2, 9)}`,
            name: taskNames[i % taskNames.length],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            dueDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            estimatedHours: Math.floor(Math.random() * 16) + 2,
        }));
    };

    if (groupBy === "user") {
        return [
            { id: "u1", type: "user", name: "Alice Johnson", tasks: generateTasks(6), capacity: 40 },
            { id: "u2", type: "user", name: "Bob Smith", tasks: generateTasks(4), capacity: 40 },
            { id: "u3", type: "user", name: "Charlie Brown", tasks: generateTasks(7), capacity: 32 },
            { id: "u4", type: "user", name: "Diana Prince", tasks: generateTasks(3), capacity: 40 },
            { id: "u5", type: "user", name: "Eve Wilson", tasks: generateTasks(5), capacity: 24 },
            { id: "unassigned", type: "user", name: "Unassigned", tasks: generateTasks(4), capacity: 0 },
        ];
    } else if (groupBy === "team") {
        return [
            { id: "t1", type: "team", name: "Frontend Team", color: "#3b82f6", tasks: generateTasks(8), capacity: 160 },
            { id: "t2", type: "team", name: "Backend Team", color: "#8b5cf6", tasks: generateTasks(6), capacity: 120 },
            { id: "t3", type: "team", name: "Design Team", color: "#ec4899", tasks: generateTasks(4), capacity: 80 },
            { id: "t4", type: "team", name: "QA Team", color: "#10b981", tasks: generateTasks(5), capacity: 80 },
        ];
    } else {
        return [
            { id: "p1", type: "project", name: "Website Redesign", color: "#3b82f6", tasks: generateTasks(7) },
            { id: "p2", type: "project", name: "Mobile App v2", color: "#8b5cf6", tasks: generateTasks(6) },
            { id: "p3", type: "project", name: "API Gateway", color: "#10b981", tasks: generateTasks(4) },
            { id: "p4", type: "project", name: "Data Analytics", color: "#f59e0b", tasks: generateTasks(5) },
        ];
    }
};

// =============== Config ===============

const statusConfig = {
    backlog: { label: "Backlog", bgColor: "bg-gray-500/10", borderColor: "border-gray-500", dotColor: "bg-gray-500" },
    todo: { label: "To Do", bgColor: "bg-blue-500/10", borderColor: "border-blue-500", dotColor: "bg-blue-500" },
    in_progress: { label: "In Progress", bgColor: "bg-purple-500/10", borderColor: "border-purple-500", dotColor: "bg-purple-500" },
    review: { label: "Review", bgColor: "bg-amber-500/10", borderColor: "border-amber-500", dotColor: "bg-amber-500" },
    done: { label: "Done", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500", dotColor: "bg-emerald-500" },
};

const priorityConfig = {
    low: { color: "text-gray-400", bg: "bg-gray-500/20" },
    medium: { color: "text-blue-400", bg: "bg-blue-500/20" },
    high: { color: "text-orange-400", bg: "bg-orange-500/20" },
    critical: { color: "text-red-400", bg: "bg-red-500/20" },
};

// =============== Components ===============

interface TaskCardProps {
    task: Task;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
}

function TaskCard({ task, onDragStart }: TaskCardProps) {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            className="bg-background border border-foreground/10 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-foreground/20 transition-colors group"
        >
            <p className={`text-sm font-medium ${task.status === "done" ? "text-foreground/40 line-through" : "text-foreground"}`}>
                {task.name}
            </p>

            <div className="flex items-center justify-between mt-2">
                <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig[task.priority].bg} ${priorityConfig[task.priority].color}`}>
                    {task.priority}
                </span>

                {task.dueDate && (
                    <span className={`text-xs ${isOverdue ? "text-red-400" : "text-foreground/50"}`}>
                        {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                )}
            </div>

            {task.estimatedHours && (
                <div className="mt-2 text-xs text-foreground/40">
                    {task.estimatedHours}h estimated
                </div>
            )}
        </div>
    );
}

interface StatusColumnProps {
    status: Task["status"];
    tasks: Task[];
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, status: Task["status"]) => void;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
}

function StatusColumn({ status, tasks, onDragOver, onDrop, onDragStart }: StatusColumnProps) {
    const config = statusConfig[status];

    return (
        <div
            className={`flex-1 min-w-[160px] ${config.bgColor} border-t-2 ${config.borderColor} rounded-lg p-2`}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, status)}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                    <span className="text-xs font-medium text-foreground/70">{config.label}</span>
                </div>
                <span className="text-xs text-foreground/40 bg-foreground/10 px-1.5 rounded">
                    {tasks.length}
                </span>
            </div>

            <div className="space-y-2 min-h-[60px]">
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
                ))}
            </div>

            <button className="w-full mt-2 py-1.5 text-xs text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5 rounded transition-colors flex items-center justify-center gap-1">
                <PlusIcon />
                Add Task
            </button>
        </div>
    );
}

interface SwimLaneRowProps {
    lane: SwimLane;
    isExpanded: boolean;
    onToggle: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, status: Task["status"]) => void;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
}

function SwimLaneRow({ lane, isExpanded, onToggle, onDragOver, onDrop, onDragStart }: SwimLaneRowProps) {
    const tasksByStatus = {
        backlog: lane.tasks.filter(t => t.status === "backlog"),
        todo: lane.tasks.filter(t => t.status === "todo"),
        in_progress: lane.tasks.filter(t => t.status === "in_progress"),
        review: lane.tasks.filter(t => t.status === "review"),
        done: lane.tasks.filter(t => t.status === "done"),
    };

    const totalHours = lane.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const utilization = lane.capacity ? Math.round((totalHours / lane.capacity) * 100) : 0;

    const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2);

    return (
        <div className="border border-foreground/10 rounded-xl overflow-hidden mb-4">
            {/* Lane Header */}
            <div
                className="flex items-center gap-3 px-4 py-3 bg-foreground/[0.02] cursor-pointer hover:bg-foreground/[0.04] transition-colors"
                onClick={onToggle}
            >
                <button className="text-foreground/50">
                    <CollapseIcon expanded={isExpanded} />
                </button>

                {/* Avatar/Icon */}
                {lane.type === "user" ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                        {getInitials(lane.name)}
                    </div>
                ) : (
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: lane.color || "#6b7280" }}
                    >
                        {lane.type === "team" ? <TeamIcon /> : <FolderIcon />}
                    </div>
                )}

                {/* Name and stats */}
                <div className="flex-1">
                    <h3 className="font-medium text-foreground">{lane.name}</h3>
                    <p className="text-xs text-foreground/50">
                        {lane.tasks.length} tasks • {totalHours}h estimated
                        {lane.capacity ? ` • ${utilization}% capacity` : ""}
                    </p>
                </div>

                {/* Progress bar */}
                {lane.capacity && lane.capacity > 0 && (
                    <div className="w-24">
                        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${utilization > 100 ? "bg-red-500" :
                                        utilization > 80 ? "bg-amber-500" : "bg-emerald-500"
                                    }`}
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Status summary badges */}
                <div className="flex gap-1">
                    {Object.entries(tasksByStatus).map(([status, tasks]) => (
                        tasks.length > 0 && (
                            <span
                                key={status}
                                className={`px-1.5 py-0.5 rounded text-xs ${statusConfig[status as Task["status"]].dotColor} text-white`}
                            >
                                {tasks.length}
                            </span>
                        )
                    ))}
                </div>
            </div>

            {/* Expanded Content - Status Columns */}
            {isExpanded && (
                <div className="p-4 flex gap-3 overflow-x-auto">
                    {(Object.keys(statusConfig) as Task["status"][]).map(status => (
                        <StatusColumn
                            key={status}
                            status={status}
                            tasks={tasksByStatus[status]}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            onDragStart={onDragStart}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============== Main Component ===============

export default function SwimlanePage() {
    const [groupBy, setGroupBy] = useState<GroupBy>("user");
    const [lanes, setLanes] = useState<SwimLane[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLanes, setExpandedLanes] = useState<Set<string>>(new Set());
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [draggedFromLane, setDraggedFromLane] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            const data = generateMockData(groupBy);
            setLanes(data);
            setExpandedLanes(new Set(data.slice(0, 2).map(l => l.id)));
            setLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [groupBy]);

    const toggleLane = (laneId: string) => {
        setExpandedLanes(prev => {
            const next = new Set(prev);
            if (next.has(laneId)) {
                next.delete(laneId);
            } else {
                next.add(laneId);
            }
            return next;
        });
    };

    const handleDragStart = (e: React.DragEvent, taskId: string, laneId: string) => {
        setDraggedTaskId(taskId);
        setDraggedFromLane(laneId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, laneId: string, newStatus: Task["status"]) => {
        e.preventDefault();
        if (!draggedTaskId || !draggedFromLane) return;

        setLanes(prev => {
            const newLanes = [...prev];

            // Find source lane and task
            const sourceLaneIndex = newLanes.findIndex(l => l.id === draggedFromLane);
            if (sourceLaneIndex === -1) return prev;

            const taskIndex = newLanes[sourceLaneIndex].tasks.findIndex(t => t.id === draggedTaskId);
            if (taskIndex === -1) return prev;

            // Remove from source
            const [task] = newLanes[sourceLaneIndex].tasks.splice(taskIndex, 1);
            task.status = newStatus;

            // Add to target lane
            const targetLaneIndex = newLanes.findIndex(l => l.id === laneId);
            if (targetLaneIndex !== -1) {
                newLanes[targetLaneIndex].tasks.push(task);
            }

            return newLanes;
        });

        setDraggedTaskId(null);
        setDraggedFromLane(null);
    };

    const expandAll = () => setExpandedLanes(new Set(lanes.map(l => l.id)));
    const collapseAll = () => setExpandedLanes(new Set());

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
                        <h1 className="text-2xl font-bold text-foreground">Swimlane View</h1>
                        <p className="text-foreground/60 mt-1">
                            Tasks grouped by {groupBy === "user" ? "team member" : groupBy}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Group by selector */}
                        <div className="flex items-center bg-foreground/5 rounded-lg p-1">
                            {([
                                { value: "user", label: "By User", icon: UserIcon },
                                { value: "team", label: "By Team", icon: TeamIcon },
                                { value: "project", label: "By Project", icon: FolderIcon },
                            ] as const).map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setGroupBy(value)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${groupBy === value
                                            ? "bg-blue-600 text-white"
                                            : "text-foreground/70 hover:text-foreground"
                                        }`}
                                >
                                    <Icon />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Expand/Collapse */}
                        <div className="flex gap-1">
                            <button
                                onClick={expandAll}
                                className="px-3 py-2 text-sm text-foreground/60 hover:text-foreground bg-foreground/5 rounded-lg transition-colors"
                            >
                                Expand All
                            </button>
                            <button
                                onClick={collapseAll}
                                className="px-3 py-2 text-sm text-foreground/60 hover:text-foreground bg-foreground/5 rounded-lg transition-colors"
                            >
                                Collapse All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {(Object.entries(statusConfig) as [Task["status"], typeof statusConfig.backlog][]).map(([status, config]) => {
                        const count = lanes.reduce((sum, lane) => sum + lane.tasks.filter(t => t.status === status).length, 0);
                        return (
                            <div key={status} className="bg-foreground/[0.02] border border-foreground/10 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${config.dotColor}`} />
                                    <span className="text-sm font-medium text-foreground">{config.label}</span>
                                </div>
                                <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Swimlanes */}
                <div>
                    {lanes.map(lane => (
                        <SwimLaneRow
                            key={lane.id}
                            lane={lane}
                            isExpanded={expandedLanes.has(lane.id)}
                            onToggle={() => toggleLane(lane.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e, status) => handleDrop(e, lane.id, status)}
                            onDragStart={(e, taskId) => handleDragStart(e, taskId, lane.id)}
                        />
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
