"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import {
    getMyExpenses,
    deleteExpense,
    submitExpense,
    type Expense,
    type ExpenseStatus,
    type ExpensesParams,
} from "@/services/expenses";

import NewExpenseModal from "@/components/NewExpenseModal";
import { HowItWorks } from "@/components/ui/HowItWorks";

// ============ Config ============

const STATUS_FILTERS: { key: ExpenseStatus | "all"; label: string; color: string }[] = [
    { key: "all", label: "All", color: "#3b82f6" },
    { key: "draft", label: "Draft", color: "#6b7280" },
    { key: "pending", label: "Pending", color: "#eab308" },
    { key: "approved", label: "Approved", color: "#22c55e" },
    { key: "rejected", label: "Rejected", color: "#ef4444" },
    { key: "returned", label: "Returned For Edit", color: "#f97316" },
];

const CATEGORY_MAP: Record<string, string> = {
    accommodation: "Accommodation",
    travel: "Travel",
    meal: "Meals",
    transport: "Transport",
    supplies: "Office Supplies",
    communication: "Communication",
    entertainment: "Entertainment",
    software: "Software",
    equipment: "Equipment",
    other: "Other",
};

// ============ Helpers ============

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return dateStr; }
}

function getCategoryLabel(expense: Expense): string {
    if (expense.items && expense.items.length > 0) {
        return CATEGORY_MAP[expense.items[0].expense_type] || expense.items[0].expense_type || "—";
    }
    return "—";
}

// ============ Sub-components ============

function StatusPill({ status }: { status: string }) {
    const cfg = STATUS_FILTERS.find((s) => s.key === status);
    const color = cfg?.color || "#6b7280";
    const label = cfg?.label || status.charAt(0).toUpperCase() + status.slice(1);
    return (
        <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: `${color}20`, color }}
        >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            {label}
        </span>
    );
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-foreground/10 rounded ${className || ""}`} />;
}

function PageSkeleton() {
    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center"><Skeleton className="h-8 w-40" /><Skeleton className="h-10 w-36 rounded-lg" /></div>
            <div className="flex gap-3">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-8 w-24 rounded-full" />)}</div>
            <Skeleton className="h-64 rounded-xl" />
        </div>
    );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-lg font-semibold text-foreground/80 mb-2">No expense requests to Track and manage your expense view</h3>
            <p className="text-sm text-foreground/40 max-w-md mb-1">Manage and track your expenses with ease, submit requests for approval, and keep all</p>
            <p className="text-sm text-foreground/40 max-w-md mb-6">expense records organized in one place.</p>
            <button onClick={onAdd} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground hover:bg-foreground/5 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Expense
            </button>
        </div>
    );
}

// ============ Expense Row ============

function ExpenseRow({
    expense, isMenuOpen, onMenuToggle, onCloseMenu, onDelete, onSubmit, onEdit, onViewReceipt,
}: {
    expense: Expense;
    isMenuOpen: boolean;
    onMenuToggle: () => void;
    onCloseMenu: () => void;
    onDelete: () => void;
    onSubmit: () => void;
    onEdit: () => void;
    onViewReceipt: () => void;
}) {
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isMenuOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, left: rect.right - 200 });
        }
    }, [isMenuOpen]);

    useEffect(() => {
        if (!isMenuOpen) return;
        function handler(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) onCloseMenu();
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isMenuOpen, onCloseMenu]);

    const itemCount = expense.items?.length || 0;
    const isDraft = expense.status === "draft";
    const canSubmit = expense.status === "draft" || expense.status === "returned";

    return (
        <tr className="border-t border-foreground/5 hover:bg-foreground/[0.02] transition">
            <td className="py-3 pl-4 w-10">
                <input type="checkbox" className="rounded border-foreground/20 bg-transparent" />
            </td>
            <td className="py-3 pr-3">
                <span className="text-sm text-foreground/90">{expense.title}</span>
            </td>
            <td className="py-3 pr-3">
                <span className="text-sm text-foreground/60">{getCategoryLabel(expense)}</span>
            </td>
            <td className="py-3 pr-3 text-sm text-foreground/60">
                {formatDate(expense.created_at)}
            </td>
            <td className="py-3 pr-3 text-sm text-foreground/60 text-center">
                {itemCount}
            </td>
            <td className="py-3 pr-3 text-sm text-foreground/80">
                {`${(expense.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${expense.currency || "EGP"}`}
            </td>
            <td className="py-3 pr-3 text-sm text-foreground/60">
                {expense.project_name || "—"}
            </td>
            <td className="py-3 pr-3">
                <StatusPill status={expense.status} />
            </td>
            <td className="py-3 pr-4 w-10">
                <button ref={btnRef} onClick={onMenuToggle} className="p-1 rounded hover:bg-foreground/10 text-foreground/40 hover:text-foreground transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
                    </svg>
                </button>
                {isMenuOpen && createPortal(
                    <div ref={menuRef} className="fixed w-[200px] rounded-lg border border-foreground/10 bg-background shadow-2xl z-[9999] py-1 overflow-hidden" style={{ top: menuPos.top, left: menuPos.left }}>
                        <ActionBtn icon="🧾" label="View Receipt" onClick={() => { onCloseMenu(); onViewReceipt(); }} />
                        <ActionBtn icon="✏️" label="Edit Expense" onClick={() => { onCloseMenu(); onEdit(); }} />
                        {canSubmit && (
                            <ActionBtn icon="📤" label="Submit for Approval" onClick={() => { onCloseMenu(); onSubmit(); }} />
                        )}
                        <div className="border-t border-foreground/5 my-1" />
                        {isDraft && (
                            <button onClick={() => { onCloseMenu(); onDelete(); }} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 transition flex items-center gap-2">
                                <span>🗑</span> Delete
                            </button>
                        )}
                    </div>,
                    document.body
                )}
            </td>
        </tr>
    );
}

function ActionBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
    return (
        <button onClick={onClick} className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-foreground/5 transition flex items-center gap-2">
            <span>{icon}</span> {label}
        </button>
    );
}

// ============ Delete Confirmation ============

function DeleteExpenseModal({ isOpen, title, onClose, onConfirm, isDeleting }: {
    isOpen: boolean; title: string; onClose: () => void; onConfirm: () => void; isDeleting: boolean;
}) {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
            <div className="bg-background border border-foreground/10 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-foreground mb-2">Delete Expense</h3>
                <p className="text-sm text-foreground/60 mb-6">Are you sure you want to delete <strong>&quot;{title}&quot;</strong>? This action cannot be undone.</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-foreground/15 text-foreground hover:bg-foreground/5 transition">Cancel</button>
                    <button onClick={onConfirm} disabled={isDeleting} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500 transition disabled:opacity-50">
                        {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ============ Main Page ============

export default function MyExpensePage() {
    const router = useRouter();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeStatus, setActiveStatus] = useState<string>("all");
    const [showNewExpense, setShowNewExpense] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    // Delete modal state
    const [deleteExpenseData, setDeleteExpenseData] = useState<Expense | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit modal state
    const [editExpenseData, setEditExpenseData] = useState<Expense | null>(null);

    const fetchData = useCallback(async () => {
        const token = getToken();
        if (!token) { router.push("/login?redirect=/my-expense"); return; }
        try {
            const params: ExpensesParams = {};
            if (activeStatus !== "all") params.status = activeStatus as ExpenseStatus;
            const expensesData = await getMyExpenses(params);
            setExpenses(expensesData);
            setLoading(false);
        } catch (err: unknown) {
            console.error("My Expense fetch error:", err);
            const e = err as { status?: number; message?: string };
            if (e?.status === 401 || e?.message?.includes("Not authenticated")) { router.push("/login?redirect=/my-expense"); return; }
            setError("Failed to load expenses");
            setLoading(false);
        }
    }, [router, activeStatus]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeleteConfirm = async () => {
        if (!deleteExpenseData) return;
        setIsDeleting(true);
        try { await deleteExpense(deleteExpenseData.id); setDeleteExpenseData(null); fetchData(); } catch (err) { console.error("Delete error:", err); } finally { setIsDeleting(false); }
    };

    const handleSubmitForApproval = async (expense: Expense) => {
        try { await submitExpense(expense.id); fetchData(); } catch (err) { console.error("Submit error:", err); }
    };

    // Filter by search query
    const filteredExpenses = expenses.filter((e) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return e.title.toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q);
    });

    if (loading) return <PageSkeleton />;
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-foreground/60 text-sm">{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">My Expenses</h1>
                <button onClick={() => setShowNewExpense(true)} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground hover:bg-foreground/5 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    New Expense
                </button>
            </div>

            {/* How It Works */}
            <HowItWorks
                pageKey="my-expense"
                color="amber"
                description="My Expenses lets you create, track, and submit expense requests for approval — keeping all your receipts and spending records organized."
                bullets={[
                    "Click New Expense to create an expense report with line items.",
                    "Filter by status (Draft, Pending, Approved, etc.) using the pill tabs.",
                    "Drafts can be deleted; submitted expenses follow an approval workflow.",
                    "Click the ⋯ menu on any row to edit, submit for approval, or view receipts.",
                    "Submitted expenses will be reviewed by your manager before approval.",
                ]}
            />

            {/* Status Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
                {STATUS_FILTERS.map((sf) => (
                    <button
                        key={sf.key}
                        onClick={() => setActiveStatus(sf.key)}
                        className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition ${activeStatus === sf.key
                            ? "border-blue-500/50 bg-blue-500/15 text-blue-500"
                            : "border-foreground/15 bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
                            }`}
                    >
                        {sf.label}
                    </button>
                ))}

                {/* Date Filter */}
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 transition">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Date
                </button>

                {/* Search */}
                <div className="ml-auto flex items-center gap-2">
                    {showSearch && (
                        <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Escape") { setShowSearch(false); setSearchQuery(""); } }}
                            placeholder="Search expenses..."
                            className="px-3 py-1.5 text-xs rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/30 outline-none focus:border-blue-500/50 w-48 transition"
                        />
                    )}
                    <button onClick={() => setShowSearch(!showSearch)} className="inline-flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            {filteredExpenses.length === 0 ? (
                <EmptyState onAdd={() => setShowNewExpense(true)} />
            ) : (
                <div className="rounded-xl border border-foreground/10 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs uppercase tracking-wider text-foreground/40 border-b border-foreground/5">
                                <th className="py-3 pl-4 w-10 font-medium"><input type="checkbox" className="rounded border-foreground/20 bg-transparent" /></th>
                                <th className="py-3 pr-3 font-medium">Title</th>
                                <th className="py-3 pr-3 font-medium">Category</th>
                                <th className="py-3 pr-3 font-medium">Date</th>
                                <th className="py-3 pr-3 font-medium text-center">Items</th>
                                <th className="py-3 pr-3 font-medium">Total (EGP)</th>
                                <th className="py-3 pr-3 font-medium">Project</th>
                                <th className="py-3 pr-3 font-medium">Status</th>
                                <th className="py-3 pr-4 w-10 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map((expense) => (
                                <ExpenseRow
                                    key={expense.id}
                                    expense={expense}
                                    isMenuOpen={openMenuId === expense.id}
                                    onMenuToggle={() => setOpenMenuId(openMenuId === expense.id ? null : expense.id)}
                                    onCloseMenu={() => setOpenMenuId(null)}
                                    onDelete={() => setDeleteExpenseData(expense)}
                                    onSubmit={() => handleSubmitForApproval(expense)}
                                    onEdit={() => setEditExpenseData(expense)}
                                    onViewReceipt={() => {
                                        // View receipt - check if any item has a receipt path
                                        const receiptItem = expense.items?.find((i) => i.receipt_path || i.attachment_url);
                                        if (receiptItem) {
                                            const url = receiptItem.receipt_path || receiptItem.attachment_url;
                                            if (url) window.open(`/api/uploads/${url}`, "_blank");
                                        }
                                    }}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            <NewExpenseModal
                isOpen={showNewExpense || !!editExpenseData}
                onClose={() => { setShowNewExpense(false); setEditExpenseData(null); }}
                onExpenseCreated={fetchData}
                projects={[]}
                editExpense={editExpenseData}
            />
            <DeleteExpenseModal
                isOpen={!!deleteExpenseData}
                title={deleteExpenseData?.title || ""}
                onClose={() => setDeleteExpenseData(null)}
                onConfirm={handleDeleteConfirm}
                isDeleting={isDeleting}
            />
        </div>
    );
}
