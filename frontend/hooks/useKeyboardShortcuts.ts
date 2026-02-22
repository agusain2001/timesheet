/**
 * useKeyboardShortcuts — Global keyboard shortcuts hook.
 *
 * Shortcuts:
 *   Ctrl+K / Cmd+K  → Open search (navigates to /search)
 *   Ctrl+N / Cmd+N  → Open new task modal (dispatches custom event "open-new-task")
 *   Ctrl+/          → Show shortcut help overlay
 *   Escape          → Close shortcut help overlay
 *
 * Usage:
 *   const { showHelp, setShowHelp } = useKeyboardShortcuts({ onNewTask, onSearch });
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ShortcutOptions {
    onNewTask?: () => void;
    onSearch?: () => void;
}

export function useKeyboardShortcuts(opts: ShortcutOptions = {}) {
    const router = useRouter();
    const [showHelp, setShowHelp] = useState(false);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const mod = e.ctrlKey || e.metaKey;
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        const isEditing =
            ["input", "textarea", "select"].includes(tag) ||
            !!(e.target as HTMLElement)?.isContentEditable;

        // Ctrl+/ — help overlay (always works)
        if (mod && e.key === "/") {
            e.preventDefault();
            setShowHelp((v) => !v);
            return;
        }

        // Escape — close help
        if (e.key === "Escape") {
            setShowHelp(false);
            return;
        }

        // Don't fire other shortcuts while typing
        if (isEditing) return;

        if (mod && e.key === "k") {
            e.preventDefault();
            if (opts.onSearch) opts.onSearch();
            else router.push("/search");
        }

        if (mod && e.key === "n") {
            e.preventDefault();
            if (opts.onNewTask) opts.onNewTask();
            else window.dispatchEvent(new CustomEvent("open-new-task"));
        }
    }, [router, opts]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    return { showHelp, setShowHelp };
}
