"use client";

import { useState, useEffect } from "react";
import { X, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface HowItWorksProps {
    /** Unique key to persist dismiss state per page in localStorage */
    pageKey: string;
    /** Short description shown inline */
    description: string;
    /** Optional extra bullet points for a richer explanation */
    bullets?: string[];
    /** Optional color accent: 'blue' | 'purple' | 'green' | 'amber' */
    color?: "blue" | "purple" | "green" | "amber";
}

const COLOR_MAP = {
    blue: { bg: "bg-blue-500/8", border: "border-blue-500/20", icon: "text-blue-400", text: "text-blue-300", bullet: "bg-blue-400" },
    purple: { bg: "bg-purple-500/8", border: "border-purple-500/20", icon: "text-purple-400", text: "text-purple-300", bullet: "bg-purple-400" },
    green: { bg: "bg-green-500/8", border: "border-green-500/20", icon: "text-green-400", text: "text-green-300", bullet: "bg-green-400" },
    amber: { bg: "bg-amber-500/8", border: "border-amber-500/20", icon: "text-amber-400", text: "text-amber-300", bullet: "bg-amber-400" },
};

export function HowItWorks({ pageKey, description, bullets, color = "blue" }: HowItWorksProps) {
    const storageKey = `hiw_dismissed_${pageKey}`;
    const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
    const [expanded, setExpanded] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        setDismissed(saved === "true");
        setMounted(true);
    }, [storageKey]);

    const handleDismiss = () => {
        localStorage.setItem(storageKey, "true");
        setDismissed(true);
    };

    if (!mounted || dismissed) return null;

    const c = COLOR_MAP[color];

    return (
        <div
            className={`rounded-xl border ${c.bg} ${c.border} px-4 py-3 flex gap-3 items-start transition-all animate-in fade-in slide-in-from-top-1 duration-300`}
        >
            {/* Icon */}
            <HelpCircle size={16} className={`${c.icon} shrink-0 mt-0.5`} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                    <div className="flex-1">
                        <span className={`text-xs font-semibold ${c.icon} mr-1.5`}>How it works:</span>
                        <span className="text-xs text-foreground/60">{description}</span>
                    </div>

                    {/* Expand/Collapse if bullets exist */}
                    {bullets && bullets.length > 0 && (
                        <button
                            onClick={() => setExpanded((v) => !v)}
                            className={`shrink-0 text-foreground/40 hover:${c.icon} transition-colors mt-0.5`}
                            title={expanded ? "Show less" : "Show more"}
                        >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                </div>

                {/* Expandable bullets */}
                {expanded && bullets && bullets.length > 0 && (
                    <ul className="mt-2 space-y-1">
                        {bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-foreground/55">
                                <span className={`w-1.5 h-1.5 rounded-full ${c.bullet} shrink-0 mt-1.5`} />
                                {b}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Dismiss */}
            <button
                onClick={handleDismiss}
                className="shrink-0 text-foreground/30 hover:text-foreground/70 transition-colors mt-0.5"
                title="Dismiss"
                aria-label="Dismiss how it works"
            >
                <X size={14} />
            </button>
        </div>
    );
}
