"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Shield, ShieldCheck, ShieldOff, Loader2, Copy, CheckCircle2,
    AlertCircle, X, Key, RefreshCw,
} from "lucide-react";
import { getToken } from "@/lib/auth";

// ─── API ──────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API}/api${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Request failed");
    return data;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "status" | "setup" | "verify" | "enabled";

interface SetupData { secret: string; qr_code_url: string; backup_codes: string[]; }

// ─── MFA Setup Wizard ─────────────────────────────────────────────────────────

export default function MFAPage() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<Step>("status");
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [code, setCode] = useState("");
    const [disableCode, setDisableCode] = useState("");
    const [error, setError] = useState("");
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [showDisable, setShowDisable] = useState(false);
    const [toast, setToast] = useState("");

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

    const loadStatus = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch("/api/mfa/status");
            setIsEnabled(data.is_enabled);
            setStep(data.is_enabled ? "enabled" : "status");
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadStatus(); }, [loadStatus]);

    const startSetup = async () => {
        setProcessing(true); setError("");
        try {
            const data = await apiFetch("/api/mfa/setup", { method: "POST" });
            setSetupData(data);
            setStep("setup");
        } catch (e: any) { setError(e?.message || "Failed to start setup"); }
        finally { setProcessing(false); }
    };

    const verify = async () => {
        if (code.length !== 6) { setError("Please enter the 6-digit code"); return; }
        setProcessing(true); setError("");
        try {
            await apiFetch("/api/mfa/verify", { method: "POST", body: JSON.stringify({ code }) });
            setIsEnabled(true);
            setStep("enabled");
            showToast("MFA enabled successfully!");
        } catch (e: any) { setError(e?.message || "Invalid code"); }
        finally { setProcessing(false); }
    };

    const disable = async () => {
        if (!disableCode) { setError("Enter your current MFA code"); return; }
        setProcessing(true); setError("");
        try {
            await apiFetch("/api/mfa/disable", { method: "POST", body: JSON.stringify({ code: disableCode }) });
            setIsEnabled(false); setStep("status");
            setShowDisable(false); setDisableCode("");
            showToast("MFA has been disabled");
        } catch (e: any) { setError(e?.message || "Invalid code"); }
        finally { setProcessing(false); }
    };

    const loadBackupCodes = async () => {
        try {
            const data = await apiFetch("/api/mfa/backup-codes");
            setBackupCodes(data.backup_codes ?? []);
        } catch { }
    };

    const copy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const inputCls = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-indigo-500/50 text-base tracking-[0.3em] text-center";

    if (loading) return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
    );

    return (
        <div className="min-h-screen p-6 bg-background text-foreground">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm shadow-2xl">
                    <CheckCircle2 size={14} /> {toast}
                </div>
            )}

            <div className="max-w-lg mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Shield size={22} className="text-indigo-400" /> Two-Factor Authentication
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Secure your account with TOTP-based two-factor authentication</p>
                </div>

                {/* Status Card */}
                <div className={`p-5 rounded-2xl border flex items-center gap-4 ${isEnabled ? "border-green-500/30 bg-green-500/5" : "border-white/10 bg-white/3"
                    }`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isEnabled ? "bg-green-500/20" : "bg-slate-500/20"
                        }`}>
                        {isEnabled ? <ShieldCheck size={22} className="text-green-400" /> : <ShieldOff size={22} className="text-slate-500" />}
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-slate-200">{isEnabled ? "MFA is Enabled" : "MFA is Disabled"}</p>
                        <p className="text-sm text-slate-500">
                            {isEnabled
                                ? "Your account is protected with two-factor authentication."
                                : "Add an extra layer of security to your account."}
                        </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isEnabled ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-500"}`}>
                        {isEnabled ? "Active" : "Inactive"}
                    </div>
                </div>

                {/* ── STEP: Status (not enabled) ── */}
                {step === "status" && (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/3 p-5 space-y-3">
                            <h3 className="text-sm font-semibold text-slate-300">How it works</h3>
                            <div className="space-y-2">
                                {[
                                    "Install an authenticator app (Google Authenticator, Authy, etc.)",
                                    "Scan the QR code or enter the secret manually",
                                    "Enter the 6-digit code to verify and enable",
                                ].map((s, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                        <p className="text-sm text-slate-400">{s}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"><AlertCircle size={14} />{error}</div>}
                        <button onClick={startSetup} disabled={processing}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50">
                            {processing ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                            Set Up Two-Factor Authentication
                        </button>
                    </div>
                )}

                {/* ── STEP: Setup (show QR code) ── */}
                {step === "setup" && setupData && (
                    <div className="space-y-5">
                        <div className="rounded-2xl border border-white/10 bg-white/3 p-5 flex flex-col items-center gap-4">
                            <p className="text-sm text-slate-400 text-center">Scan this QR code with your authenticator app, or enter the secret key manually.</p>
                            {/* QR code display - we use a QR image API */}
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qr_code_url)}`}
                                alt="QR Code"
                                className="w-48 h-48 rounded-xl bg-white p-2"
                            />
                            <div className="w-full">
                                <p className="text-xs text-slate-500 mb-1">Secret Key (manual entry)</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-indigo-300 text-sm font-mono tracking-wider break-all">
                                        {setupData.secret}
                                    </code>
                                    <button onClick={() => copy(setupData.secret)}
                                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 transition-colors">
                                        {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 mb-1">Enter the 6-digit code from your app</p>
                            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="000000" maxLength={6} className={inputCls} />
                        </div>
                        {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"><AlertCircle size={14} />{error}</div>}
                        <div className="flex gap-3">
                            <button onClick={() => { setStep("status"); setSetupData(null); setCode(""); }}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 text-sm transition-colors">
                                Cancel
                            </button>
                            <button onClick={verify} disabled={processing || code.length !== 6}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                                {processing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                Verify &amp; Enable
                            </button>
                        </div>
                        {/* Backup codes preview */}
                        {setupData.backup_codes.length > 0 && (
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                                <p className="text-sm font-semibold text-amber-400 mb-2">⚠ Save your backup codes</p>
                                <p className="text-xs text-slate-500 mb-3">Store these securely. Each can be used once if you lose your authenticator.</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {setupData.backup_codes.map((c, i) => (
                                        <code key={i} className="px-2 py-1 rounded bg-white/5 text-slate-300 text-xs font-mono">{c}</code>
                                    ))}
                                </div>
                                <button onClick={() => copy(setupData.backup_codes.join("\n"))}
                                    className="mt-3 flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                                    <Copy size={11} /> Copy all codes
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP: Enabled ── */}
                {step === "enabled" && (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/3 p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-300">Recovery Codes</h3>
                                <button onClick={loadBackupCodes}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                                    <RefreshCw size={11} /> View codes
                                </button>
                            </div>
                            {backupCodes.length > 0 && (
                                <div className="grid grid-cols-2 gap-1.5">
                                    {backupCodes.map((c, i) => (
                                        <code key={i} className="px-2 py-1 rounded bg-white/5 text-slate-400 text-xs font-mono">{c}</code>
                                    ))}
                                </div>
                            )}
                            {backupCodes.length === 0 && (
                                <p className="text-xs text-slate-600">Click "View codes" to reveal your recovery codes.</p>
                            )}
                        </div>

                        <button onClick={() => { setShowDisable(!showDisable); setError(""); setDisableCode(""); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-medium text-sm transition-colors">
                            <ShieldOff size={16} /> Disable Two-Factor Authentication
                        </button>

                        {showDisable && (
                            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
                                <p className="text-sm text-slate-400">Enter your current authenticator code to disable MFA.</p>
                                <input value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="000000" maxLength={6} className={inputCls} />
                                {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"><AlertCircle size={14} />{error}</div>}
                                <div className="flex gap-3">
                                    <button onClick={() => { setShowDisable(false); setDisableCode(""); setError(""); }}
                                        className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 text-sm transition-colors">
                                        Cancel
                                    </button>
                                    <button onClick={disable} disabled={processing || disableCode.length !== 6}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                                        {processing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                                        Confirm Disable
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
