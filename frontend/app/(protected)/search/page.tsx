"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    globalSearch,
    type SearchResult, type EntityType, type SearchResponse,
} from "@/services/search";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { id: EntityType | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "task", label: "Tasks" },
    { id: "project", label: "Projects" },
    { id: "user", label: "People" },
    { id: "comment", label: "Comments" },
];

const TYPE_BADGE_MAP: Record<EntityType, string> = {
    task: "bg-indigo-500/20 text-indigo-400",
    project: "bg-blue-500/20 text-blue-400",
    user: "bg-purple-500/20 text-purple-400",
    comment: "bg-slate-500/20 text-slate-400",
    client: "bg-green-500/20 text-green-400",
    team: "bg-amber-500/20 text-amber-400",
    expense: "bg-red-500/20 text-red-400",
};

// ─── Result Item ──────────────────────────────────────────────────────────────

function ResultItem({ result, onClick }: { result: SearchResult; onClick: () => void }) {
    const badge = TYPE_BADGE_MAP[result.entity_type] ?? "bg-slate-500/20 text-slate-400";

    return (
        <button
            onClick={onClick}
            className="w-full text-left flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/15 transition-all group"
        >
            <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${badge}`}>
                {result.entity_type}
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors truncate">
                    {result.title}
                </p>
                {result.highlight ? (
                    <p
                        className="text-xs text-slate-500 mt-0.5 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: result.highlight }}
                    />
                ) : result.description ? (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{result.description}</p>
                ) : null}
            </div>
            <span className="text-xs text-slate-700 shrink-0 mt-0.5">
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

    const runSearch = useCallback(async (q: string, cat: EntityType | "all") => {
        if (!q.trim()) { setResponse(null); return; }
        setLoading(true);
        try {
            const res = await globalSearch(q, {
                entity_types: cat === "all" ? undefined : [cat],
                limit: 30,
            });
            setResponse(res);
        } catch { setResponse(null); }
        finally { setLoading(false); }
    }, []);

    // Debounced search
    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => runSearch(query, category), 350);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [query, category, runSearch]);

    const handleResultClick = (result: SearchResult) => {
        if (result.url) {
            router.push(result.url);
        } else if (result.entity_type === "task") {
            router.push(`/tasks?id=${result.id}`);
        } else if (result.entity_type === "project") {
            router.push(`/projects?id=${result.id}`);
        } else if (result.entity_type === "user") {
            router.push(`/employees?id=${result.id}`);
        }
    };

    // Group results by entity type
    const grouped: Record<string, SearchResult[]> = {};
    (response?.results ?? []).forEach((r) => {
        (grouped[r.entity_type] ??= []).push(r);
    });

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground max-w-3xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-100">Global Search</h1>
                <p className="text-sm text-slate-500 mt-1">Search tasks, projects, people, and more</p>
            </div>

            {/* Search input */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type to search..."
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 text-base transition-colors"
                />
                {loading && (
                    <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-indigo-400" />
                )}
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2 flex-wrap">
                {CATEGORIES.map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setCategory(id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${category === id
                                ? "bg-indigo-600 text-white"
                                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
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

            {/* Meta */}
            {response && (
                <p className="text-xs text-slate-600">
                    {response.total} results for "{response.query}"
                    {response.took_ms != null ? ` · ${response.took_ms}ms` : ""}
                </p>
            )}

            {/* Results */}
            {!query.trim() ? (
                <div className="text-center py-16">
                    <Search size={40} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500">Start typing to search across the workspace</p>
                </div>
            ) : loading && !response ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={28} className="animate-spin text-indigo-400" />
                </div>
            ) : !response || response.total === 0 ? (
                <div className="text-center py-12 text-slate-600 text-sm">
                    No results for "{query}"
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([type, items]) => (
                        <div key={type}>
                            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 capitalize">
                                {type}s ({items.length})
                            </h2>
                            <div className="space-y-2">
                                {items.map((r) => (
                                    <ResultItem
                                        key={r.id}
                                        result={r}
                                        onClick={() => handleResultClick(r)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
