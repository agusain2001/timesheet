"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// =============== Types ===============

type CommandCategory = "navigation" | "actions" | "search" | "recent";

interface Command {
    id: string;
    category: CommandCategory;
    icon: React.ReactNode;
    title: string;
    description?: string;
    shortcut?: string;
    action: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

// =============== Icons ===============

const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const HomeIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const KanbanIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const ProjectIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const TaskIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const TeamIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ReportIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const SettingsIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const HistoryIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// =============== Main Component ===============

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Define commands
    const commands: Command[] = [
        // Navigation
        { id: "nav-dashboard", category: "navigation", icon: <HomeIcon />, title: "Go to Dashboard", shortcut: "G D", action: () => router.push("/dashboard") },
        { id: "nav-kanban", category: "navigation", icon: <KanbanIcon />, title: "Go to Kanban Board", shortcut: "G K", action: () => router.push("/kanban") },
        { id: "nav-calendar", category: "navigation", icon: <CalendarIcon />, title: "Go to Calendar", shortcut: "G C", action: () => router.push("/calendar") },
        { id: "nav-projects", category: "navigation", icon: <ProjectIcon />, title: "Go to Projects", shortcut: "G P", action: () => router.push("/projects") },
        { id: "nav-tasks", category: "navigation", icon: <TaskIcon />, title: "Go to Tasks", shortcut: "G T", action: () => router.push("/tasks") },
        { id: "nav-teams", category: "navigation", icon: <TeamIcon />, title: "Go to Teams", action: () => router.push("/teams") },
        { id: "nav-timesheet", category: "navigation", icon: <ClockIcon />, title: "Go to Timesheet", action: () => router.push("/timesheet") },
        { id: "nav-reports", category: "navigation", icon: <ReportIcon />, title: "Go to Reports", action: () => router.push("/reports") },
        { id: "nav-settings", category: "navigation", icon: <SettingsIcon />, title: "Go to Settings", action: () => router.push("/settings") },

        // Actions
        { id: "action-new-task", category: "actions", icon: <PlusIcon />, title: "Create New Task", shortcut: "N T", action: () => { router.push("/kanban"); } },
        { id: "action-new-project", category: "actions", icon: <PlusIcon />, title: "Create New Project", shortcut: "N P", action: () => { router.push("/projects"); } },
        { id: "action-start-timer", category: "actions", icon: <ClockIcon />, title: "Start Timer", action: () => { router.push("/timesheet"); } },

        // Recent (mock data)
        { id: "recent-1", category: "recent", icon: <HistoryIcon />, title: "Website Redesign", description: "Project", action: () => router.push("/projects") },
        { id: "recent-2", category: "recent", icon: <HistoryIcon />, title: "Implement login page", description: "Task", action: () => router.push("/tasks") },
        { id: "recent-3", category: "recent", icon: <HistoryIcon />, title: "Frontend Team", description: "Team", action: () => router.push("/teams") },
    ];

    // Filter commands based on query
    const filteredCommands = query
        ? commands.filter(
            (cmd) =>
                cmd.title.toLowerCase().includes(query.toLowerCase()) ||
                cmd.description?.toLowerCase().includes(query.toLowerCase())
        )
        : commands;

    // Group commands by category
    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) {
            acc[cmd.category] = [];
        }
        acc[cmd.category].push(cmd);
        return acc;
    }, {} as Record<CommandCategory, Command[]>);

    const categoryLabels: Record<CommandCategory, string> = {
        recent: "Recent",
        actions: "Actions",
        navigation: "Navigation",
        search: "Search Results",
    };

    const categoryOrder: CommandCategory[] = ["recent", "actions", "navigation", "search"];

    // Flatten for keyboard navigation
    const flatCommands = categoryOrder
        .filter((cat) => groupedCommands[cat]?.length > 0)
        .flatMap((cat) => groupedCommands[cat]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev + 1) % flatCommands.length);
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev - 1 + flatCommands.length) % flatCommands.length);
                    break;
                case "Enter":
                    e.preventDefault();
                    if (flatCommands[selectedIndex]) {
                        flatCommands[selectedIndex].action();
                        onClose();
                    }
                    break;
                case "Escape":
                    e.preventDefault();
                    onClose();
                    break;
            }
        },
        [isOpen, flatCommands, selectedIndex, onClose]
    );

    // Listen for keyboard events
    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            selectedElement?.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex]);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    if (!isOpen) return null;

    let globalIndex = 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-background border border-foreground/10 rounded-2xl shadow-2xl z-[100] overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-foreground/10">
                    <div className="text-foreground/40">
                        <SearchIcon />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search commands, pages, or type a query..."
                        className="flex-1 bg-transparent text-foreground placeholder:text-foreground/40 outline-none text-base"
                    />
                    <kbd className="px-2 py-1 text-xs bg-foreground/10 rounded text-foreground/50">ESC</kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-96 overflow-y-auto p-2">
                    {flatCommands.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-foreground/40">
                            <SearchIcon />
                            <p className="mt-2 text-sm">No results found</p>
                        </div>
                    ) : (
                        categoryOrder.map((category) => {
                            const categoryCommands = groupedCommands[category];
                            if (!categoryCommands?.length) return null;

                            return (
                                <div key={category} className="mb-2">
                                    <div className="px-3 py-1.5 text-xs font-medium text-foreground/40 uppercase tracking-wider">
                                        {categoryLabels[category]}
                                    </div>
                                    {categoryCommands.map((cmd) => {
                                        const currentIndex = globalIndex++;
                                        const isSelected = currentIndex === selectedIndex;

                                        return (
                                            <button
                                                key={cmd.id}
                                                data-index={currentIndex}
                                                onClick={() => {
                                                    cmd.action();
                                                    onClose();
                                                }}
                                                onMouseEnter={() => setSelectedIndex(currentIndex)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isSelected
                                                        ? "bg-blue-600 text-white"
                                                        : "text-foreground hover:bg-foreground/5"
                                                    }`}
                                            >
                                                <div className={isSelected ? "text-white" : "text-foreground/60"}>
                                                    {cmd.icon}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="text-sm font-medium">{cmd.title}</p>
                                                    {cmd.description && (
                                                        <p className={`text-xs ${isSelected ? "text-white/70" : "text-foreground/50"}`}>
                                                            {cmd.description}
                                                        </p>
                                                    )}
                                                </div>
                                                {cmd.shortcut && (
                                                    <div className="flex items-center gap-1">
                                                        {cmd.shortcut.split(" ").map((key, i) => (
                                                            <kbd
                                                                key={i}
                                                                className={`px-1.5 py-0.5 text-xs rounded ${isSelected
                                                                        ? "bg-white/20 text-white"
                                                                        : "bg-foreground/10 text-foreground/50"
                                                                    }`}
                                                            >
                                                                {key}
                                                            </kbd>
                                                        ))}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-foreground/10 bg-foreground/[0.02]">
                    <div className="flex items-center gap-4 text-xs text-foreground/40">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-foreground/10 rounded">↑</kbd>
                            <kbd className="px-1 py-0.5 bg-foreground/10 rounded">↓</kbd>
                            to navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-foreground/10 rounded">↵</kbd>
                            to select
                        </span>
                    </div>
                    <div className="text-xs text-foreground/40">
                        Type to search
                    </div>
                </div>
            </div>
        </>
    );
}

// Hook to use command palette with keyboard shortcut
export function useCommandPalette() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to open
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
    };
}

export default CommandPalette;
