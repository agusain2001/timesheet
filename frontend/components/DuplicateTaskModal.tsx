"use client";

import { useRef, useEffect } from "react";

interface DuplicateTaskModalProps {
    isOpen: boolean;
    taskName: string;
    onClose: () => void;
    onConfirm: () => void;
    isDuplicating?: boolean;
}

export default function DuplicateTaskModal({ isOpen, taskName, onClose, onConfirm, isDuplicating }: DuplicateTaskModalProps) {
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

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="relative w-full max-w-[440px] rounded-2xl border border-foreground/10 bg-background shadow-2xl overflow-hidden">
                {/* Icon + Message */}
                <div className="p-6 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                        <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-foreground mb-2">Duplicate Task?</h2>
                    <p className="text-sm text-foreground/60 mb-4">
                        This will create a copy of the following task with status set to <strong className="text-foreground">Draft</strong>.
                    </p>

                    {/* Task Info Card */}
                    <div className="bg-foreground/[0.04] border border-foreground/10 rounded-xl p-4 text-left">
                        <p className="text-sm font-medium text-foreground truncate">{taskName}</p>
                        <div className="mt-3 space-y-1.5">
                            <InfoRow label="Copied" value="Name, type, project, priority, description, estimated hours" />
                            <InfoRow label="Reset" value="Status → Draft, Assignee → You" />
                            <InfoRow label="Not copied" value="Comments, attachments, time logs" />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 pt-0">
                    <button
                        onClick={onClose}
                        disabled={isDuplicating}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDuplicating}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition disabled:opacity-40"
                    >
                        {isDuplicating ? "Duplicating..." : "Duplicate Task"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-2 text-xs">
            <span className="text-foreground/40 shrink-0 w-20">{label}:</span>
            <span className="text-foreground/60">{value}</span>
        </div>
    );
}
