"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Loader2, FileText, FolderKanban, Users, MessageSquare, Hash } from "lucide-react";
import { getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string) {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return res.json();
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES = [
    { id: "all", label: "All", Icon: Search },
    { id: "tasks", label: "Tasks", Icon: FileText },
    { id: "projects", label: "Projects", Icon: FolderKanban },
    { id: "users", label: "People", Icon: Users },
    { id: "comments", label: "Comments", Icon: MessageSquare },
];

// ─── Result Item ──────────────────────────────────────────────────────────────

function ResultItem({ item, onNavigate }: { item: any; onNavigate: (item: any) => void }) {
    const Icon = CATEGORIES.find((c) => c.id === item.type)?.Icon || Hash;

    return (
        <button
            onClick={() => onNavigate(item)}
            className="w-full flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-left transition-colors group"
        >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                <Icon size={14} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{item.title || item.name}</p>
                {item.subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{item.subtitle}</p>}
                {item.snippet && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2" dangerouslySetInnerHTML={{
                        __html: item.snippet.replace(/<mark>/g, '<mark class="bg-indigo-500/30 text-indigo-300 rounded px-0.5">').replace(/<\/mark>/g, "</mark>")
                    }} />
                )}
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize shrink-0 ${item.type === "tasks" ? "bg-blue-500/20 text-blue-400" :
                    item.type === "projects" ? "bg-violet-500/20 text-violet-400" :
                        item.type === "users" ? "bg-green-500/20 text-green-400" :
                            "bg-slate-700 text-slate-400"
                }`}>
                {item.type?.replace("s", "") || item.type}
            </span>
        </button>
    );
}

// ─── Search Page ──────────────────────────────────────────────────────────────

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("all");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const router = useRouter();

    const doSearch = useCallback(async (q: string, cat: string) => {
        if (!q.trim() || q.trim().length < 2) { setResults([]); setSearched(false); return; }
        setLoading(true);
        setSearched(false);
        try {
            const params = new URLSearchParams({ q: q.trim() });
            if (cat !== "all") params.set("type", cat);
            const data = await apiFetch(`/search?${params.toString()}`);
            setResults(data?.results || data || []);
            setSearched(true);
        } catch { setResults([]); setSearched(true); }
        finally { setLoading(false); }
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => { doSearch(query, category); }, 350);
        return () => clearTimeout(timer);
    }, [query, category, doSearch]);

    const handleNavigate = (item: any) => {
        if (item.type === "tasks") router.push(`/tasks/all?selected=${item.id}`);
        else if (item.type === "projects") router.push(`/projects?selected=${item.id}`);
        else if (item.type === "users") router.push(`/employees?id=${item.id}`);
    };

    const taskResults = results.filter((r) => r.type === "tasks");
    const projectResults = results.filter((r) => r.type === "projects");
    const userResults = results.filter((r) => r.type === "users");
    const otherResults = results.filter((r) => !["tasks", "projects", "users"].includes(r.type));

    const grouped = [
        { label: "Tasks", items: taskResults },
        { label: "Projects", items: projectResults },
        { label: "People", items: userResults },
        { label: "Other", items: otherResults },
    ].filter((g) => g.items.length > 0);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold">Search</h1>
                    <p className="text-sm text-slate-500 mt-1">Search across tasks, projects, people, and more</p>
                </div>

                {/* Search input */}
                <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search anything..."
                        autoFocus
                        className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 text-base"
                    />
                    {query && (
                        <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Category tabs */}
                <div className="flex items-center gap-1 overflow-x-auto">
                    {CATEGORIES.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            onClick={() => setCategory(id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${category === id
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                }`}
                        >
                            <Icon size={13} /> {label}
                        </button>
                    ))}
                </div>

                {/* Results */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={28} className="animate-spin text-indigo-400" />
                    </div>
                ) : !query.trim() ? (
                    <div className="text-center py-16">
                        <Search size={48} className="text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500">Type to search across your workspace</p>
                        <p className="text-slate-700 text-sm mt-2">Search for tasks, projects, people, comments, and more</p>
                    </div>
                ) : searched && results.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-slate-400">No results for "<strong>{query}</strong>"</p>
                        <p className="text-slate-600 text-sm mt-2">Try different keywords or check spelling</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <p className="text-sm text-slate-500">
                            {results.length} result{results.length !== 1 ? "s" : ""} for "<strong className="text-slate-300">{query}</strong>"
                        </p>
                        {grouped.map((group) => (
                            <div key={group.label}>
                                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 px-1">{group.label}</h3>
                                <div className="rounded-2xl border border-white/10 overflow-hidden">
                                    {group.items.map((item, i) => (
                                        <div key={i} className={i > 0 ? "border-t border-white/5" : ""}>
                                            <ResultItem item={item} onNavigate={handleNavigate} />
                                        </div>
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
