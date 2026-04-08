"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
    createExpense,
    updateExpense,
    uploadReceipt,
    type Expense,
    type ExpenseCreate,
    type ExpenseItemCreate,
    type ExpenseType,
} from "@/services/expenses";
import { validateSafeText } from "@/utils/validation";
interface ProjectOption {
    id: string;
    name: string;
}

// ============ Types ============

interface ExpenseItemForm {
    id: string;
    name: string;
    quantity: number;
    amount: number;
}

const CATEGORIES: { value: ExpenseType; label: string }[] = [
    { value: "accommodation", label: "Accommodation" },
    { value: "travel", label: "Travel" },
    { value: "meal", label: "Meals" },
    { value: "transport", label: "Transport" },
    { value: "supplies", label: "Office Supplies" },
    { value: "other", label: "Other" },
];

let itemIdCounter = 0;
function nextItemId() { return `item_${++itemIdCounter}_${Date.now()}`; }

// ============ Date Picker ============

function SimpleDatePicker({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
    const [viewDate, setViewDate] = useState(() => {
        if (value) return new Date(value);
        return new Date();
    });
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    return (
        <div ref={ref} className="absolute top-full left-0 mt-2 w-[280px] rounded-lg border border-foreground/10 bg-background shadow-2xl z-50 p-3">
            <div className="flex items-center justify-between mb-3">
                <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-foreground/10 text-foreground/60">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm font-medium text-foreground">{monthNames[month]} {year}</span>
                <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-foreground/10 text-foreground/60">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
                {dayLabels.map((d) => <div key={d} className="text-[10px] text-center text-foreground/30 font-medium">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                    if (day === null) return <div key={i} />;
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isSelected = dateStr === value;
                    const isToday = dateStr === todayStr;
                    return (
                        <button key={i} onClick={() => { onChange(dateStr); onClose(); }}
                            className={`w-8 h-8 rounded-full text-xs flex items-center justify-center transition ${isSelected ? "bg-blue-600 text-white" : isToday ? "bg-foreground/10 text-foreground font-bold" : "text-foreground/70 hover:bg-foreground/5"}`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ============ Main Modal ============

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onExpenseCreated: () => void;
    projects: ProjectOption[];
    editExpense?: Expense | null;
}

export default function NewExpenseModal({ isOpen, onClose, onExpenseCreated, projects, editExpense }: Props) {
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState<ExpenseType | "">("");
    const [showCategoryDD, setShowCategoryDD] = useState(false);
    const [expenseDate, setExpenseDate] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [projectId, setProjectId] = useState("");
    const [showProjectDD, setShowProjectDD] = useState(false);
    const [items, setItems] = useState<ExpenseItemForm[]>([
        { id: nextItemId(), name: "", quantity: 1, amount: 0 },
        { id: nextItemId(), name: "", quantity: 1, amount: 0 },
    ]);
    const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const categoryRef = useRef<HTMLDivElement>(null);
    const projectRef = useRef<HTMLDivElement>(null);

    // Populate form if editing
    useEffect(() => {
        if (editExpense) {
            setTitle(editExpense.title);
            if (editExpense.items && editExpense.items.length > 0) {
                setCategory(editExpense.items[0].expense_type || "");
                setExpenseDate(editExpense.items[0].date || "");
            }
            setProjectId(editExpense.project_id || "");
            if (editExpense.items && editExpense.items.length > 0) {
                setItems(editExpense.items.map((it) => ({
                    id: nextItemId(),
                    name: it.description || "",
                    quantity: 1,
                    amount: it.amount,
                })));
            }
        } else {
            resetForm();
        }
    }, [editExpense, isOpen]);

    // Close dropdowns on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setShowCategoryDD(false);
            if (projectRef.current && !projectRef.current.contains(e.target as Node)) setShowProjectDD(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const resetForm = () => {
        setTitle(""); setCategory(""); setExpenseDate(""); setProjectId("");
        setItems([
            { id: nextItemId(), name: "", quantity: 1, amount: 0 },
            { id: nextItemId(), name: "", quantity: 1, amount: 0 },
        ]);
        setReceiptFiles([]); setError(null);
    };

    const totalAmount = items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);

    const addItem = () => {
        setItems([...items, { id: nextItemId(), name: "", quantity: 1, amount: 0 }]);
    };

    const updateItem = (id: string, field: keyof ExpenseItemForm, value: string | number) => {
        setItems(items.map((it) => it.id === id ? { ...it, [field]: value } : it));
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems(items.filter((it) => it.id !== id));
    };

    const handleSave = async (asDraft: boolean) => {
        const valErr = validateSafeText(title, "Title", 100);
        if (valErr) { setError(valErr); return; }

        setSaving(true);
        setError(null);
        try {
            const expenseItems: ExpenseItemCreate[] = items
                .filter((it) => it.name.trim() || it.amount > 0)
                .map((it) => ({
                    date: expenseDate || new Date().toISOString().split("T")[0],
                    expense_type: category || "other",
                    amount: it.amount * it.quantity,
                    description: it.name,
                }));

            let expenseObj;
            if (editExpense) {
                expenseObj = await updateExpense(editExpense.id, {
                    title,
                    project_id: projectId || undefined,
                    items: expenseItems.length > 0 ? expenseItems : undefined,
                    status: asDraft ? "draft" : undefined,
                } as any);
            } else {
                const data: ExpenseCreate = {
                    title,
                    project_id: projectId || undefined,
                    items: expenseItems.length > 0 ? expenseItems : undefined,
                };
                expenseObj = await createExpense(data);
            }

            if (receiptFiles.length > 0 && expenseObj && expenseObj.id && expenseObj.items) {
                const items = expenseObj.items;
                await Promise.all(receiptFiles.map((file, idx) => {
                    const matchedItem = items[Math.min(idx, items.length - 1)];
                    return uploadReceipt(expenseObj.id, file, matchedItem?.id);
                }));
            }

            onExpenseCreated();
            resetForm();
            onClose();
        } catch (err: unknown) {
            console.error("Save expense error:", err);
            setError("Failed to save expense. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
            <div className="bg-background border border-foreground/10 rounded-xl w-full max-w-[720px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-2">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Expense Details</h2>
                        <p className="text-xs text-foreground/40 mt-1">This expense will be visible to your project manager.</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-foreground/10 text-foreground/40 hover:text-foreground transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="px-6 pb-6 space-y-6">
                    {/* Error */}
                    {error && (
                        <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</div>
                    )}

                    {/* Expense Details Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-foreground/10 pb-2">Expense Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Title */}
                            <div>
                                <label className="text-xs text-foreground/50 mb-1 block">Title</label>
                                <input
                                    value={title} onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Hotel Expense"
                                    className="w-full px-3 py-2 text-sm rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/30 outline-none focus:border-blue-500/50 transition"
                                />
                                <p className="text-[10px] text-foreground/40 mt-1">Only letters, numbers, spaces and basic punctuation (- &apos; . ) are allowed.</p>
                            </div>
                            {/* Category */}
                            <div ref={categoryRef} className="relative">
                                <label className="text-xs text-foreground/50 mb-1 block">Category</label>
                                <button onClick={() => setShowCategoryDD(!showCategoryDD)}
                                    className="w-full px-3 py-2 text-sm rounded-lg bg-foreground/5 border border-foreground/10 text-left flex items-center justify-between transition hover:border-foreground/20"
                                >
                                    <span className={category ? "text-foreground" : "text-foreground/30"}>
                                        {category ? CATEGORIES.find((c) => c.value === category)?.label : "Select Category"}
                                    </span>
                                    <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {showCategoryDD && (
                                    <div className="absolute top-full left-0 mt-1 w-full rounded-lg border border-foreground/10 bg-background shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
                                        {CATEGORIES.map((c) => (
                                            <button key={c.value} onClick={() => { setCategory(c.value); setShowCategoryDD(false); }}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-foreground/5 transition ${category === c.value ? "text-blue-500" : "text-foreground/80"}`}
                                            >
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Expense Context Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-foreground/10 pb-2">Expense Items</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Date */}
                            <div className="relative">
                                <label className="text-xs text-foreground/50 mb-1 block">Expense Date</label>
                                <button onClick={() => setShowDatePicker(!showDatePicker)}
                                    className="w-full px-3 py-2 text-sm rounded-lg bg-foreground/5 border border-foreground/10 text-left flex items-center justify-between transition hover:border-foreground/20"
                                >
                                    <span className={expenseDate ? "text-foreground" : "text-foreground/30"}>
                                        {expenseDate || "Select date"}
                                    </span>
                                    <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                {showDatePicker && (
                                    <SimpleDatePicker value={expenseDate} onChange={setExpenseDate} onClose={() => setShowDatePicker(false)} />
                                )}
                            </div>
                            {/* Project */}
                            <div ref={projectRef} className="relative">
                                <label className="text-xs text-foreground/50 mb-1 block">Project</label>
                                <button onClick={() => setShowProjectDD(!showProjectDD)}
                                    className="w-full px-3 py-2 text-sm rounded-lg bg-foreground/5 border border-foreground/10 text-left flex items-center justify-between transition hover:border-foreground/20"
                                >
                                    <span className={projectId ? "text-foreground" : "text-foreground/30"}>
                                        {projectId ? projects.find((p) => p.id === projectId)?.name : "Select Project"}
                                    </span>
                                    <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {showProjectDD && (
                                    <div className="absolute top-full left-0 mt-1 w-full rounded-lg border border-foreground/10 bg-background shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
                                        <button onClick={() => { setProjectId(""); setShowProjectDD(false); }}
                                            className="w-full text-left px-3 py-2 text-sm text-foreground/40 hover:bg-foreground/5 transition">
                                            — None —
                                        </button>
                                        {projects.map((p) => (
                                            <button key={p.id} onClick={() => { setProjectId(p.id); setShowProjectDD(false); }}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-foreground/5 transition ${projectId === p.id ? "text-blue-500" : "text-foreground/80"}`}
                                            >
                                                {p.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Expense Items Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-foreground/10 pb-2">Expense Items</h3>
                        <div className="space-y-4">
                            {items.map((item, idx) => (
                                <div key={item.id} className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-foreground/50 mb-1 block">Item Name</label>
                                            <input value={item.name} onChange={(e) => updateItem(item.id, "name", e.target.value)}
                                                placeholder="e.g. Hotel Stay"
                                                className="w-full px-3 py-2 text-sm rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/30 outline-none focus:border-blue-500/50 transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-foreground/50 mb-1 block">Quantity</label>
                                            <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                                                placeholder="Enter Number"
                                                className="w-full px-3 py-2 text-sm rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/30 outline-none focus:border-blue-500/50 transition"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-3">
                                        <div className="flex-1">
                                            <label className="text-xs text-foreground/50 mb-1 block">Amount (EGP)</label>
                                            <input type="number" min={0} step="0.01" value={item.amount || ""} onChange={(e) => updateItem(item.id, "amount", parseFloat(e.target.value) || 0)}
                                                placeholder="Enter Amount in EGP"
                                                className="w-full px-3 py-2 text-sm rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/30 outline-none focus:border-blue-500/50 transition"
                                            />
                                        </div>
                                        {items.length > 1 && (
                                            <button onClick={() => removeItem(item.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition mb-0.5" title="Remove item">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-end">
                                <button onClick={addItem} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-foreground/15 text-foreground hover:bg-foreground/5 transition">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    New Item
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Total Amount */}
                    <div>
                        <label className="text-xs text-foreground/50 mb-1 block">Total Amount <span className="text-foreground/30">(Auto-calculated)</span></label>
                        <div className="px-3 py-2 text-sm rounded-lg bg-foreground/5 border border-foreground/10 text-foreground/60">
                            {totalAmount > 0 ? `${totalAmount.toFixed(2)} EGP` : "**Derived from items × amount**"}
                        </div>
                    </div>

                    {/* Receipt Upload */}
                    <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3">Receipt Upload</h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <label className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-foreground/5 border border-foreground/10 cursor-pointer hover:border-foreground/20 transition">
                                    <span className="text-sm text-foreground/30 flex-1">
                                        Upload a File (.jpg, .png, .jpeg, .pdf)
                                    </span>
                                    <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <input id="receipt-upload-input" type="file" accept=".jpg,.jpeg,.png,.pdf" multiple className="hidden"
                                        onChange={(e) => { 
                                            if (e.target.files) {
                                                setReceiptFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                                e.target.value = "";
                                            } 
                                        }}
                                    />
                                </label>
                                <button type="button" onClick={() => document.getElementById('receipt-upload-input')?.click()} className="flex-shrink-0 w-9 h-9 rounded-lg border border-foreground/10 flex items-center justify-center text-foreground/40 hover:bg-foreground/5 transition">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </button>
                            </div>
                            
                            {/* Selected Files List */}
                            {receiptFiles.length > 0 && (
                                <div className="space-y-2 mt-1">
                                    {receiptFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm rounded-lg bg-foreground/5 border border-foreground/10">
                                            <span className="text-foreground/80 truncate pr-4">{file.name}</span>
                                            <button type="button" onClick={() => setReceiptFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-500 transition">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-foreground/5">
                        <button onClick={() => handleSave(true)} disabled={saving}
                            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-foreground/15 text-foreground hover:bg-foreground/5 transition disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save as Draft"}
                        </button>
                        <button onClick={() => handleSave(false)} disabled={saving}
                            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Add Task"}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
