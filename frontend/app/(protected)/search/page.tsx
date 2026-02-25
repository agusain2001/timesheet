"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, BookmarkPlus, Trash2, BookmarkCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    globalSearch,
    type SearchResult, type EntityType, type SearchResponse,
} from "@/services/search";
import { getToken } from "@/lib/auth";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { id: EntityType | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "task", label: "Tasks" },
    { id: "project", label: "Projects" },
    { id: "user", label: "People" },
    { id: "comment", label: "Comments" },
];

const TYPE_BADGE_MAP: Record<EntityType, string> = {
    task: "bg-blue-500/20 text-blue-400",
    project: "bg-blue-500/20 text-blue-400",
    user: "bg-purple-500/20 text-purple-400",
    comment: "bg-slate-500/20 text-foreground/60",
    client: "bg-green-500/20 text-green-400",
    team: "bg-amber-500/20 text-amber-400",
    expense: "bg-red-500/20 text-red-400",
};

// ─── Result Item ──────────────────────────────────────────────────────────────

function ResultItem({ result, onClick }: { result: SearchResult; onClick: () => void }) {
    const badge = TYPE_BADGE_MAP[result.entity_type] ?? "bg-slate-500/20 text-foreground/60";
    return (
        <button
            onClick={onClick}
            className="w-full text-left flex items-start gap-3 p-4 rounded-xl border border-foreground/5 bg-foreground/[0.01] hover:bg-white/8 hover:border-white/15 transition-all group"
        >
            <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${badge}`}>
                {result.entity_type}
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors truncate">
                    {result.title}
                </p>
                {result.highlight ? (
                    <p className="text-xs text-foreground/50 mt-0.5 line-clamp-2" dangerouslySetInnerHTML={{ __html: result.highlight }} />
                ) : result.description ? (
                    <p className="text-xs text-foreground/50 mt-0.5 line-clamp-2">{result.description}</p>
                ) : null}
            </div>
            <span className="text-xs text-foreground/30 shrink-0 mt-0.5">
                {Math.round((result.score ?? 0) * 100)}%
            </span>
        </button>
    );
}

// ─── Search Page ──────────────────────────────────────────────────────────────

export default function SearchPage() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<EntityType | "all">("all");
    const [response, setResponse] = useState<SearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Saved filters state
    const [savedFilters, setSavedFilters] = useState<any[]>([]);
    const [filterName, setFilterName] = useState("");
    const [savingFilter, setSavingFilter] = useState(false);

    const loadSavedFilters = useCallback(async () => {
        try {
            const token = getToken();
            const res = await fetch("/api/advanced/saved-filters", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) { const data = await res.json(); setSavedFilters(Array.isArray(data) ? data : []); }
        } catch { }
    }, []);

    useEffect(() => { loadSavedFilters(); }, [loadSavedFilters]);

    const saveFilter = async () => {
        if (!filterName.trim() || !query.trim()) return;
        setSavingFilter(true);
        try {
            const token = getToken();
            await fetch("/api/advanced/saved-filters", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: filterName.trim(), query, category }),
            });
            setFilterName(""); loadSavedFilters();
        } catch { }
        setSavingFilter(false);
    };

    const deleteFilter = async (id: string) => {
        try {
            const token = getToken();
            await fetch(`/api/advanced/saved-filters/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            loadSavedFilters();
        } catch { }
    };

    const applyFilter = (f: any) => {
        setQuery(f.query ?? "");
        setCategory(f.category ?? "all");
    };

    const runSearch = useCallback(async (q: string, cat: EntityType | "all") => {
        if (!q.trim()) { setResponse(null); return; }
        setLoading(true);
        try {
            const res = await globalSearch(q, { entity_types: cat === "all" ? undefined : [cat], limit: 30 });
            setResponse(res);
        } catch { setResponse(null); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => runSearch(query, category), 350);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [query, category, runSearch]);

    const handleResultClick = (result: SearchResult) => {
        if (result.url) { router.push(result.url); }
        else if (result.entity_type === "task") { router.push(`/tasks?id=${result.id}`); }
        else if (result.entity_type === "project") { router.push(`/projects?id=${result.id}`); }
        else if (result.entity_type === "user") { router.push(`/employees?id=${result.id}`); }
    };

    const grouped: Record<string, SearchResult[]> = {};
    (response?.results ?? []).forEach((r) => { (grouped[r.entity_type] ??= []).push(r); });

    return (
        <div className="min-h-screen p-6 bg-background text-foreground flex gap-6">
            {/* Saved Filters Sidebar */}
            <aside className="w-56 shrink-0 space-y-4 pt-1">
                <div>
                    <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <BookmarkCheck size={11} /> Saved Filters
                    </p>
                    {savedFilters.length === 0 ? (
                        <p className="text-xs text-foreground/40 py-2">No saved filters yet</p>
                    ) : (
                        <div className="space-y-1">
                            {savedFilters.map((f: any) => (
                                <div key={f.id}
                                    className="flex items-center justify-between group rounded-lg px-2.5 py-2 hover:bg-foreground/[0.02] cursor-pointer"
                                    onClick={() => applyFilter(f)}
                                >
                                    <div>
                                        <p className="text-xs text-foreground/80 font-medium truncate max-w-[120px]">{f.name}</p>
                                        <p className="text-[10px] text-foreground/40">{f.category || "all"}</p>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); deleteFilter(f.id); }}
                                        className="opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-red-400 transition p-0.5"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {query.trim() && (
                    <div className="space-y-2 pt-3 border-t border-foreground/5">
                        <p className="text-[10px] text-foreground/40 uppercase tracking-widest">Save current search</p>
                        <input
                            value={filterName}
                            onChange={e => setFilterName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && saveFilter()}
                            placeholder="Filter name…"
                            className="w-full px-2.5 py-1.5 text-xs bg-foreground/[0.02] border border-foreground/10 rounded-lg text-foreground/80 placeholder-foreground/60 outline-none focus:border-blue-500/50"
                        />
                        <button
                            onClick={saveFilter}
                            disabled={savingFilter || !filterName.trim()}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-medium disabled:opacity-50 transition"
                        >
                            <BookmarkPlus size={11} /> Save Filter
                        </button>
                    </div>
                )}
            </aside>

            {/* Main search area */}
            <div className="flex-1 space-y-6 max-w-3xl">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Global Search</h1>
                    <p className="text-sm text-foreground/50 mt-1">Search tasks, projects, people, and more</p>
                </div>

                <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type to search..."
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-foreground/[0.02] border border-foreground/10 text-foreground/90 placeholder-foreground/60 focus:outline-none focus:border-blue-500/50 text-base transition-colors"
                    />
                    {loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {CATEGORIES.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setCategory(id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${category === id
                                ? "bg-blue-600 text-white"
                                : "bg-foreground/[0.02] text-foreground/60 hover:bg-foreground/[0.05] hover:text-foreground/90"
                                }`}
                        >
                            {label}
                            {id !== "all" && response?.facets?.[id] && (
                                <span className="ml-1.5 text-xs opacity-70">
                                    {response.facets[id].reduce((s, f) => s + f.count, 0)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {response && (
                    <p className="text-xs text-foreground/40">
                        {response.total} results for "{response.query}"
                        {response.took_ms != null ? ` · ${response.took_ms}ms` : ""}
                    </p>
                )}

                {!query.trim() ? (
                    <div className="text-center py-16">
                        <Search size={40} className="text-foreground/30 mx-auto mb-3" />
                        <p className="text-foreground/50">Start typing to search across the workspace</p>
                    </div>
                ) : loading && !response ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={28} className="animate-spin text-blue-400" />
                    </div>
                ) : !response || response.total === 0 ? (
                    <div className="text-center py-12 text-foreground/40 text-sm">
                        No results for "{query}"
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([type, items]) => (
                            <div key={type}>
                                <h2 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3 capitalize">
                                    {type}s ({items.length})
                                </h2>
                                <div className="space-y-2">
                                    {items.map((r) => (
                                        <ResultItem key={r.id} result={r} onClick={() => handleResultClick(r)} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
