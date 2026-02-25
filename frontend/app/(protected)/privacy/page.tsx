"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Shield, Download, Trash2, Eye, ToggleLeft, ToggleRight,
    Loader2, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
    Lock, FileText, Activity,
} from "lucide-react";
import {
    exportMyData, deleteMyData, getConsent, updateConsent, getAccessLog,
    type GDPRConsent,
} from "@/services/gdpr";

// ─── Section Card ─────────────────────────────────────────────────────────────

function Card({ title, icon: Icon, children, className = "" }: {
    title: string; icon: any; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={`rounded-2xl border border-foreground/10 bg-foreground/[0.02] dark:bg-foreground/[0.01] p-6 space-y-4 ${className}`}>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Icon size={16} className="text-blue-500 dark:text-blue-400" /> {title}
            </h2>
            {children}
        </div>
    );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-foreground/5 last:border-0">
            <span className="text-sm text-foreground/80 font-medium">{label}</span>
            <button onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${checked ? "bg-blue-500" : "bg-foreground/20"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
            </button>
        </div>
    );
}

// ─── GDPR Privacy Page ────────────────────────────────────────────────────────

export default function PrivacyPage() {
    const [consent, setConsent] = useState<GDPRConsent | null>(null);
    const [accessLog, setAccessLog] = useState<any[]>([]);
    const [exportData, setExportData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "done">("idle");
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [showLog, setShowLog] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [toast, setToast] = useState("");
    const [savingConsent, setSavingConsent] = useState(false);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [c, log] = await Promise.all([
                getConsent(),
                getAccessLog(20),
            ]);
            setConsent(c);
            setAccessLog(Array.isArray(log) ? log : []);
        } catch { setConsent({ marketing_emails: false, analytics_tracking: false }); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const saveConsent = async (field: keyof GDPRConsent, value: boolean) => {
        const updated = { ...consent!, [field]: value };
        setConsent(updated);
        setSavingConsent(true);
        try {
            await updateConsent({ [field]: value });
            showToast("Consent preferences saved");
        } catch { } finally { setSavingConsent(false); }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const data = await exportMyData("json");
            setExportData(data);
            setShowExport(true);
            // trigger download
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "my-data.json"; a.click();
            URL.revokeObjectURL(url);
            showToast("Data exported successfully");
        } catch { showToast("Export failed"); }
        finally { setExporting(false); }
    };

    const handleDelete = async () => {
        if (deleteConfirmText !== "DELETE") return;
        setDeleting(true);
        try {
            await deleteMyData(true, false);
            setDeleteStep("done");
        } catch (e: any) { showToast(e?.message || "Failed to delete data"); }
        finally { setDeleting(false); }
    };

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-blue-400" />
        </div>
    );

    if (deleteStep === "done") return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Data Deletion Requested</h2>
                <p className="text-foreground/60 text-sm">Your personal data deletion has been requested. You will be logged out shortly.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-6 space-y-6 bg-background text-foreground max-w-3xl">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm shadow-2xl">
                    <CheckCircle2 size={14} /> {toast}
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Shield size={22} className="text-blue-500 dark:text-blue-400" /> Privacy & Data
                </h1>
                <p className="text-sm text-foreground/50 mt-1">Manage your personal data, consent preferences, and privacy rights under GDPR</p>
            </div>

            {/* Consent */}
            {consent && (
                <Card title="Consent Preferences" icon={Lock}>
                    <p className="text-xs text-foreground/50">Control how your data is used across the platform.</p>
                    <Toggle
                        checked={consent.marketing_emails}
                        onChange={(v) => saveConsent("marketing_emails", v)}
                        label="Marketing Emails"
                    />
                    <Toggle
                        checked={consent.analytics_tracking}
                        onChange={(v) => saveConsent("analytics_tracking", v)}
                        label="Analytics & Usage Tracking"
                    />
                    {savingConsent && <p className="text-xs text-blue-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Saving…</p>}
                </Card>
            )}

            {/* Data Export */}
            <Card title="Data Portability (GDPR Art. 20)" icon={FileText}>
                <p className="text-sm text-foreground/60">Download a complete export of all your personal data including tasks, timesheets, comments, and settings.</p>
                <button onClick={handleExport} disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                    {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {exporting ? "Exporting…" : "Export My Data (JSON)"}
                </button>
                {showExport && exportData && (
                    <div className="rounded-xl bg-foreground/[0.03] border border-foreground/10 p-3 text-xs text-foreground/60 max-h-32 overflow-y-auto font-mono">
                        {Object.keys(exportData).join(", ")} — {JSON.stringify(exportData).length} bytes exported
                    </div>
                )}
            </Card>

            {/* Access Log */}
            <Card title="Data Access Log" icon={Activity}>
                <p className="text-sm text-foreground/60">Track who has accessed your personal data.</p>
                <button onClick={() => setShowLog(!showLog)}
                    className="flex items-center gap-1.5 text-sm text-blue-500 dark:text-blue-400 hover:underline">
                    {showLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showLog ? "Hide" : "Show"} access log
                </button>
                {showLog && (
                    <div className="rounded-xl border border-foreground/10 overflow-hidden">
                        {accessLog.length === 0 ? (
                            <p className="text-sm text-foreground/50 text-center py-4">No access log entries</p>
                        ) : (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-foreground/10 bg-foreground/5">
                                        {["Action", "Resource", "IP", "Time"].map((h) => (
                                            <th key={h} className="text-left px-3 py-2 text-foreground/50 font-medium">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {accessLog.map((entry: any, i) => (
                                        <tr key={i} className="border-b border-foreground/5 last:border-0">
                                            <td className="px-3 py-2 text-foreground/70">{entry.action || "—"}</td>
                                            <td className="px-3 py-2 text-foreground/60">{entry.resource_type || "—"}</td>
                                            <td className="px-3 py-2 text-foreground/50">{entry.ip_address || "—"}</td>
                                            <td className="px-3 py-2 text-foreground/50">
                                                {entry.accessed_at ? new Date(entry.accessed_at).toLocaleString() : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </Card>

            {/* Right to Erasure */}
            <Card title="Right to Erasure (GDPR Art. 17)" icon={Trash2} className="border-red-500/20 dark:border-red-500/20">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/70">
                        Permanently delete all your personal data from our systems. This action is <strong className="text-red-500">irreversible</strong> and your account will be removed.
                    </p>
                </div>

                {deleteStep === "idle" && (
                    <button onClick={() => setDeleteStep("confirm")}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-sm font-medium transition-colors">
                        <Trash2 size={14} /> Request Data Deletion
                    </button>
                )}

                {deleteStep === "confirm" && (
                    <div className="space-y-3">
                        <p className="text-sm text-foreground/70">
                            Type <strong className="font-mono text-red-500">DELETE</strong> to confirm permanent data deletion.
                        </p>
                        <input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE to confirm"
                            className="w-full px-3 py-2.5 rounded-xl bg-foreground/[0.04] border border-red-500/30 text-foreground placeholder-foreground/30 focus:outline-none focus:border-red-500/60 text-sm font-mono"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => { setDeleteStep("idle"); setDeleteConfirmText(""); }}
                                className="flex-1 py-2 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground/60 hover:text-foreground text-sm transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleDelete}
                                disabled={deleteConfirmText !== "DELETE" || deleting}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-40">
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Permanently Delete
                            </button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
