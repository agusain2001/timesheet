"use client";

/**
 * KeyboardShortcutsHelp overlay component.
 * Used by Navbar or layout to show the keyboard shortcuts help modal.
 */

export const SHORTCUTS = [
    { key: "Ctrl + K", description: "Open global search" },
    { key: "Ctrl + N", description: "Create new task" },
    { key: "Ctrl + /", description: "Show this help overlay" },
    { key: "Escape", description: "Close overlays / modals" },
    { key: "Ctrl + B", description: "Bold text (in editor)" },
    { key: "Ctrl + I", description: "Italic text (in editor)" },
    { key: "Ctrl + U", description: "Underline text (in editor)" },
];

export function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-background border border-foreground/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/10">
                    <h2 className="font-semibold text-foreground text-sm">⌨️ Keyboard Shortcuts</h2>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground text-xs border border-foreground/10 rounded px-1.5 py-0.5">
                        ESC
                    </button>
                </div>
                <div className="p-4 space-y-1">
                    {SHORTCUTS.map((s) => (
                        <div key={s.key} className="flex items-center justify-between py-2 border-b border-foreground/5 last:border-0">
                            <span className="text-sm text-foreground/60">{s.description}</span>
                            <kbd className="px-2 py-0.5 rounded-md bg-foreground/10 text-foreground/70 text-xs font-mono border border-foreground/10">
                                {s.key}
                            </kbd>
                        </div>
                    ))}
                </div>
                <div className="px-5 pb-4 text-center">
                    <p className="text-xs text-foreground/30">
                        Press <kbd className="font-mono">Ctrl + /</kbd> to toggle this overlay
                    </p>
                </div>
            </div>
        </div>
    );
}
