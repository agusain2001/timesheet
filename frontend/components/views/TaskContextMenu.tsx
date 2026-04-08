"use client";

import { useEffect, useRef } from "react";
import {
    Eye,
    Pencil,
    Trash2,
    Copy,
    MessageSquare,
    ChevronRight,
    CheckCircle2,
    Circle,
    Clock,
    XCircle,
    AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskContextMenuTask {
    id: string;
    name: string;
    status: string;
    priority?: string;
}

export interface TaskContextMenuProps {
    task: TaskContextMenuTask;
    x: number;
    y: number;
    onClose: () => void;
    onViewDetails: (task: TaskContextMenuTask) => void;
    onEdit: (task: TaskContextMenuTask) => void;
    onDelete: (task: TaskContextMenuTask) => void;
    onDuplicate: (task: TaskContextMenuTask) => void;
    onComments: (task: TaskContextMenuTask) => void;
    onStatusChange?: (taskId: string, newStatus: string) => void;
}

// ─── Status Options ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "todo", label: "To Do", icon: Circle, color: "text-gray-400" },
    { value: "in_progress", label: "In Progress", icon: Clock, color: "text-blue-400" },
    { value: "review", label: "Review", icon: AlertCircle, color: "text-yellow-400" },
    { value: "completed", label: "Done", icon: CheckCircle2, color: "text-green-400" },
    { value: "blocked", label: "Blocked", icon: XCircle, color: "text-red-400" },
    { value: "cancelled", label: "Cancelled", icon: XCircle, color: "text-gray-500" },
];

const PRIORITY_OPTIONS = [
    { value: "critical", label: "Critical", emoji: "🔴" },
    { value: "high", label: "High", emoji: "🟠" },
    { value: "medium", label: "Medium", emoji: "🟡" },
    { value: "low", label: "Low", emoji: "🟢" },
];

// ─── Menu Item ─────────────────────────────────────────────────────────────────

function MenuItem({
    icon: Icon,
    label,
    onClick,
    danger = false,
    children,
    className = "",
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    onClick?: () => void;
    danger?: boolean;
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`group relative ${className}`}>
            <button
                onClick={onClick}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-foreground/75 hover:bg-foreground/[0.06] hover:text-foreground"
                    }`}
            >
                <Icon size={14} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {children && <ChevronRight size={12} className="text-foreground/30" />}
            </button>
            {children && (
                <div className="absolute left-full top-0 ml-1 hidden group-hover:block z-50">
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── Submenu Container ─────────────────────────────────────────────────────────

function SubMenu({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-w-[160px] bg-background border border-foreground/10 rounded-xl shadow-xl p-1">
            {children}
        </div>
    );
}

// ─── TaskContextMenu ──────────────────────────────────────────────────────────

export default function TaskContextMenu({
    task,
    x,
    y,
    onClose,
    onViewDetails,
    onEdit,
    onDelete,
    onDuplicate,
    onComments,
    onStatusChange,
}: TaskContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Adjust position to stay within viewport
    const adjustedX = typeof window !== "undefined" && x + 220 > window.innerWidth ? x - 220 : x;
    const adjustedY = typeof window !== "undefined" && y + 300 > window.innerHeight ? y - 300 : y;

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            style={{ position: "fixed", top: adjustedY, left: adjustedX, zIndex: 9999 }}
            className="min-w-[200px] bg-background border border-foreground/10 rounded-xl shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100"
        >
            {/* Task name header */}
            <div className="px-3 py-2 border-b border-foreground/8 mb-1">
                <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">Task</p>
                <p className="text-sm text-foreground/80 font-medium truncate mt-0.5">{task.name}</p>
            </div>

            <MenuItem
                icon={Eye}
                label="View Details"
                onClick={() => { onViewDetails(task); onClose(); }}
            />
            <MenuItem
                icon={Pencil}
                label="Edit Task"
                onClick={() => { onEdit(task); onClose(); }}
            />
            <MenuItem
                icon={MessageSquare}
                label="Comments"
                onClick={() => { onComments(task); onClose(); }}
            />
            <MenuItem
                icon={Copy}
                label="Duplicate"
                onClick={() => { onDuplicate(task); onClose(); }}
            />

            {onStatusChange && (
                <>
                    <div className="my-1 border-t border-foreground/8" />
                    <MenuItem icon={CheckCircle2} label="Change Status">
                        <SubMenu>
                            {STATUS_OPTIONS.map((s) => {
                                const Icon = s.icon;
                                return (
                                    <button
                                        key={s.value}
                                        onClick={() => {
                                            onStatusChange(task.id, s.value);
                                            onClose();
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-foreground/[0.06] ${task.status === s.value ? "text-foreground font-medium" : "text-foreground/70"
                                            }`}
                                    >
                                        <Icon size={13} className={s.color} />
                                        {s.label}
                                        {task.status === s.value && (
                                            <CheckCircle2 size={12} className="ml-auto text-blue-400" />
                                        )}
                                    </button>
                                );
                            })}
                        </SubMenu>
                    </MenuItem>
                </>
            )}

            <div className="my-1 border-t border-foreground/8" />
            <MenuItem
                icon={Trash2}
                label="Delete Task"
                danger
                onClick={() => { onDelete(task); onClose(); }}
            />
        </div>
    );
}
