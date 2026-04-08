"use client";

import { useRef, useEffect } from "react";

interface DeleteTaskModalProps {
    isOpen: boolean;
    taskName: string;
    taskStatus: string;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
    in_progress: "#3b82f6",
    todo: "#8b5cf6",
    backlog: "#6b7280",
    waiting: "#f97316",
    draft: "#6b7280",
    review: "#eab308",
    completed: "#22c55e",
    blocked: "#ef4444",
    cancelled: "#9ca3af",
};

export default function DeleteTaskModal({ isOpen, taskName, taskStatus, onClose, onConfirm, isDeleting }: DeleteTaskModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    if (!isOpen) return null;

    const statusColor = STATUS_COLORS[taskStatus] || "#6b7280";

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="relative w-full max-w-[440px] rounded-2xl border border-foreground/10 bg-background shadow-2xl overflow-hidden">
                {/* Icon + Message */}
                <div className="p-6 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-foreground mb-2">Delete Task?</h2>
                    <p className="text-sm text-foreground/60 mb-4">
                        This will permanently delete the following task. This action cannot be undone.
                    </p>

                    {/* Task Info Card */}
                    <div className="bg-foreground/[0.04] border border-foreground/10 rounded-xl p-4 text-left">
                        <p className="text-sm font-medium text-foreground truncate">{taskName}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: `${statusColor}20`, color: statusColor }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                                {taskStatus.replace("_", " ")}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 pt-0">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-500 transition disabled:opacity-40"
                    >
                        {isDeleting ? "Deleting..." : "Delete Task"}
                    </button>
                </div>
            </div>
        </div>
    );
}
