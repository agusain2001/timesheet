"use client";

/**
 * RichTextEditor — lightweight contenteditable rich text editor.
 * No external npm dependency. Supports: Bold, Italic, Underline,
 * ordered/unordered lists, code blocks, and links.
 *
 * Usage:
 *   <RichTextEditor value={html} onChange={setHtml} placeholder="Add description…" />
 */

import { useRef, useEffect, useCallback } from "react";

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: string;
    className?: string;
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────

function TB({ title, onClick, active, children }: {
    title: string;
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            title={title}
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            className={`p-1.5 rounded text-xs font-medium transition-colors select-none ${active
                    ? "bg-indigo-500/20 text-indigo-500 dark:text-indigo-400"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/10"
                }`}
        >
            {children}
        </button>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const BoldIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>;
const ItalicIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>;
const UnderlineIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>;
const ULIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>;
const OLIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></svg>;
const CodeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
const LinkIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RichTextEditor({
    value,
    onChange,
    placeholder = "Add description…",
    minHeight = "120px",
    className = "",
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const isUpdating = useRef(false);

    // Sync value → DOM (only when value changes externally)
    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        if (isUpdating.current) return;
        if (el.innerHTML !== value) {
            el.innerHTML = value;
        }
    }, [value]);

    const exec = useCallback((command: string, val?: string) => {
        document.execCommand(command, false, val);
        editorRef.current?.focus();
    }, []);

    const handleInput = useCallback(() => {
        if (!editorRef.current) return;
        isUpdating.current = true;
        onChange(editorRef.current.innerHTML);
        requestAnimationFrame(() => { isUpdating.current = false; });
    }, [onChange]);

    const insertLink = useCallback(() => {
        const url = window.prompt("Enter URL:", "https://");
        if (url) exec("createLink", url);
    }, [exec]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Ctrl+B/I/U shortcuts
        if (e.ctrlKey || e.metaKey) {
            if (e.key === "b") { e.preventDefault(); exec("bold"); }
            if (e.key === "i") { e.preventDefault(); exec("italic"); }
            if (e.key === "u") { e.preventDefault(); exec("underline"); }
        }
    }, [exec]);

    const isActive = (command: string) => {
        try { return document.queryCommandState(command); }
        catch { return false; }
    };

    const showPlaceholder = !value || value === "<br>" || value === "";

    return (
        <div className={`rounded-xl border border-foreground/10 overflow-hidden bg-foreground/[0.02] dark:bg-white/[0.02] focus-within:border-indigo-500/50 transition-colors ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-foreground/8 bg-foreground/[0.03]">
                <TB title="Bold (Ctrl+B)" onClick={() => exec("bold")} active={isActive("bold")}><BoldIcon /></TB>
                <TB title="Italic (Ctrl+I)" onClick={() => exec("italic")} active={isActive("italic")}><ItalicIcon /></TB>
                <TB title="Underline (Ctrl+U)" onClick={() => exec("underline")} active={isActive("underline")}><UnderlineIcon /></TB>
                <div className="w-px h-3.5 bg-foreground/10 mx-1" />
                <TB title="Bullet list" onClick={() => exec("insertUnorderedList")}><ULIcon /></TB>
                <TB title="Numbered list" onClick={() => exec("insertOrderedList")}><OLIcon /></TB>
                <div className="w-px h-3.5 bg-foreground/10 mx-1" />
                <TB title="Code block" onClick={() => exec("formatBlock", "pre")}><CodeIcon /></TB>
                <TB title="Insert link" onClick={insertLink}><LinkIcon /></TB>
                <div className="w-px h-3.5 bg-foreground/10 mx-1" />
                <TB title="Clear formatting" onClick={() => { exec("removeFormat"); exec("formatBlock", "div"); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.375 2.625a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" /><line x1="2" y1="22" x2="22" y2="2" /></svg>
                </TB>
            </div>

            {/* Editable area */}
            <div className="relative">
                {showPlaceholder && (
                    <p className="absolute top-3 left-3 text-sm text-foreground/30 pointer-events-none select-none">
                        {placeholder}
                    </p>
                )}
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    className="px-3 py-2.5 text-sm text-foreground outline-none leading-relaxed [&_pre]:bg-foreground/10 [&_pre]:rounded [&_pre]:p-2 [&_pre]:text-xs [&_pre]:font-mono [&_a]:text-indigo-500 [&_a]:underline [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
                    style={{ minHeight }}
                />
            </div>
        </div>
    );
}
