"use client";

import { useState, useEffect, Suspense } from "react";
import {
    User, Shield, Bell, Eye, Camera, Lock, Smartphone,
    EyeOff, Eye as EyeIcon, Save, AlertTriangle,
    CheckCircle, Loader2, HelpCircle, ChevronDown, ChevronUp,
    ExternalLink, BookOpen, Clock, BarChart2, FolderKanban,
    Users, FileText, Zap, BotMessageSquare, Wallet,
    HeadsetIcon, Settings, KeyRound, Link2, Info, Check
} from "lucide-react";
import {
    getSettingsProfile, updateSettingsProfile,
    getSecuritySettings, changePassword, logoutDevice,
    getNotificationPrefs, updateNotificationPrefs,
    getPrivacySettings, updatePrivacySettings,
    SettingsProfile, SecuritySettings, NotificationPrefs, PrivacySettings,
    DeviceSession
} from "@/services/settings";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function cn(...classes: (string | undefined | false | null)[]) {
    return classes.filter(Boolean).join(" ");
}
function avatar(name: string) {
    return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// â”€â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type ToastType = "success" | "error" | "loading";
interface ToastState { msg: string; type: ToastType }

function ToastBar({ toast }: { toast: ToastState }) {
    const colors: Record<ToastType, string> = {
        success: "bg-green-600",
        error: "bg-red-600",
        loading: "bg-blue-600",
    };
    return (
        <div className={cn("fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl text-white shadow-2xl text-sm font-medium", colors[toast.type])}>
            {toast.type === "loading" && <Loader2 size={15} className="animate-spin" />}
            {toast.type === "success" && <CheckCircle size={15} />}
            {toast.type === "error" && <AlertTriangle size={15} />}
            {toast.msg}
        </div>
    );
}

// â”€â”€â”€ Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shrink-0 disabled:opacity-40",
                checked ? "bg-blue-600" : "bg-foreground/20"
            )}
        >
            <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-6" : "translate-x-0")} />
        </button>
    );
}

// â”€â”€â”€ Field + Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground/60 uppercase tracking-wide">{label}</label>
            {children}
        </div>
    );
}
function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={cn("w-full px-3 py-2.5 rounded-lg border border-foreground/15 bg-foreground/[0.04] text-foreground placeholder:text-foreground/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed", className)}
        />
    );
}
function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={cn("w-full px-3 py-2.5 rounded-lg border border-foreground/15 bg-foreground/[0.04] text-foreground placeholder:text-foreground/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition resize-none", className)}
        />
    );
}

// â”€â”€â”€ Password Strength â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
    if (!pw) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 2) return { level: 1, label: "Weak", color: "bg-red-500" };
    if (score <= 4) return { level: 2, label: "Fair", color: "bg-amber-500" };
    if (score <= 5) return { level: 3, label: "Good", color: "bg-blue-500" };
    return { level: 4, label: "Strong", color: "bg-green-500" };
}
function PasswordStrengthBar({ password }: { password: string }) {
    const { level, label, color } = getPasswordStrength(password);
    if (!password) return null;
    return (
        <div className="mt-1.5">
            <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-all duration-300", s <= level ? color : "bg-foreground/10")} />
                ))}
            </div>
            <span className={cn("text-xs font-medium", level === 1 ? "text-red-500" : level === 2 ? "text-amber-500" : level === 3 ? "text-blue-500" : "text-green-500")}>{label}</span>
        </div>
    );
}

// â”€â”€â”€ Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Section({ title, icon: Icon, accent, children }: { title: string; icon: any; accent: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-foreground/8">
                <div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                <Icon size={17} className="text-foreground/60" />
                <h2 className="font-semibold text-foreground text-sm">{title}</h2>
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    );
}

// â”€â”€â”€ Save Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SaveRow({ loading, onClick, disabled }: { loading: boolean; onClick: () => void; disabled?: boolean }) {
    return (
        <div className="flex justify-end mt-5 pt-4 border-t border-foreground/8">
            <button
                onClick={onClick}
                disabled={loading || disabled}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
            </button>
        </div>
    );
}

// â”€â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TABS = [
    { id: "profile", label: "Profile", icon: User, color: "#3b82f6" },
    { id: "security", label: "Security", icon: Shield, color: "#a855f7" },
    { id: "notifications", label: "Notifications", icon: Bell, color: "#f59e0b" },
    { id: "privacy", label: "Privacy", icon: Eye, color: "#10b981" },
    { id: "help", label: "Help", icon: HelpCircle, color: "#ec4899" },
] as const;

type TabId = typeof TABS[number]["id"];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PROFILE TAB
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function ProfileTab({ profile, onUpdate }: { profile: SettingsProfile | null; onUpdate: (p: SettingsProfile) => void }) {
    const [form, setForm] = useState({ full_name: "", phone: "", employee_id_display: "", emergency_contact_name: "", emergency_contact_no: "", bio: "", city: "", pincode: "", tax_address: "" });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);

    useEffect(() => {
        if (profile) setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "", employee_id_display: profile.employee_id_display ?? "", emergency_contact_name: profile.emergency_contact_name ?? "", emergency_contact_no: profile.emergency_contact_no ?? "", bio: profile.bio ?? "", city: profile.city ?? "", pincode: profile.pincode ?? "", tax_address: profile.tax_address ?? "" });
    }, [profile]);

    const showToast = (msg: string, type: ToastType = "success") => {
        setToast({ msg, type });
        if (type !== "loading") setTimeout(() => setToast(null), 3500);
    };

    const handleSave = async () => {
        setSaving(true);
        showToast("Savingâ€¦", "loading");
        try {
            const updated = await updateSettingsProfile(form);
            onUpdate(updated);
            showToast("Profile saved!", "success");
        } catch (e: any) {
            showToast(e?.message ?? "Failed to save profile", "error");
        } finally { setSaving(false); }
    };

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    return (
        <div className="space-y-6">
            {/* Avatar + Name */}
            <Section title="Basic Information" icon={User} accent="#3b82f6">
                <div className="flex items-center gap-5 mb-6">
                    <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                            {profile ? avatar(profile.full_name) : "â€”"}
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition" title="Change avatar">
                            <Camera size={11} />
                        </button>
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">{profile?.full_name ?? "â€”"}</p>
                        <p className="text-sm text-foreground/50">{profile?.email}</p>
                        <p className="text-xs text-foreground/40 capitalize mt-0.5">{profile?.role}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name"><Input value={form.full_name} onChange={set("full_name")} placeholder="Your full name" /></Field>
                    <Field label="Employee ID"><Input value={form.employee_id_display} onChange={set("employee_id_display")} placeholder="EMP-001" /></Field>
                    <Field label="Email Address"><Input value={profile?.email ?? ""} disabled placeholder="Email" /></Field>
                    <Field label="Phone Number"><Input value={form.phone} onChange={set("phone")} placeholder="+91 00000 00000" /></Field>
                    <Field label="Department"><Input value={profile?.department ?? ""} disabled placeholder="Department" /></Field>
                    <Field label="Position"><Input value={profile?.position ?? ""} disabled placeholder="Position" /></Field>
                </div>
                <div className="mt-4">
                    <Field label="Bio (Optional)">
                        <TextArea rows={3} value={form.bio} onChange={set("bio")} placeholder="A short bio about yourselfâ€¦" />
                    </Field>
                </div>
            </Section>

            <Section title="Emergency Contact" icon={HeadsetIcon} accent="#ef4444">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Contact Name (Optional)"><Input value={form.emergency_contact_name} onChange={set("emergency_contact_name")} placeholder="Emergency contact name" /></Field>
                    <Field label="Contact Number (Optional)"><Input value={form.emergency_contact_no} onChange={set("emergency_contact_no")} placeholder="Emergency contact number" /></Field>
                </div>
            </Section>

            <Section title="Address Information" icon={FileText} accent="#8b5cf6">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="City"><Input value={form.city} onChange={set("city")} placeholder="Your city" /></Field>
                    <Field label="Pincode"><Input value={form.pincode} onChange={set("pincode")} placeholder="000000" /></Field>
                    <div className="col-span-2">
                        <Field label="Tax ID / Address (Optional)"><Input value={form.tax_address} onChange={set("tax_address")} placeholder="Tax ID or billing address" /></Field>
                    </div>
                </div>
            </Section>

            <SaveRow loading={saving} onClick={handleSave} />
            {toast && <ToastBar toast={toast} />}
        </div>
    );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SECURITY TAB
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function SecurityTab() {
    const [security, setSecurity] = useState<SecuritySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
    const [showPw, setShowPw] = useState({ cur: false, new: false, conf: false });
    const [pwSaving, setPwSaving] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [mfaToggling, setMfaToggling] = useState(false);
    const [logoutSessionId, setLogoutSessionId] = useState<string | null>(null);

    const showToast = (msg: string, type: ToastType = "success") => {
        setToast({ msg, type });
        if (type !== "loading") setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        getSecuritySettings().then(setSecurity).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const handlePasswordSave = async () => {
        if (!pwForm.current_password || !pwForm.new_password || !pwForm.confirm_password) return showToast("Please fill all password fields", "error");
        if (pwForm.new_password !== pwForm.confirm_password) return showToast("New passwords do not match", "error");
        if (pwForm.new_password.length < 8) return showToast("Password must be at least 8 characters", "error");
        setPwSaving(true);
        showToast("Changing passwordâ€¦", "loading");
        try {
            await changePassword(pwForm);
            setPwForm({ current_password: "", new_password: "", confirm_password: "" });
            showToast("Password changed successfully!", "success");
        } catch (e: any) {
            showToast(e?.message ?? "Failed to change password", "error");
        } finally { setPwSaving(false); }
    };

    const handleMfaToggle = async () => {
        if (!security?.mfa_configured) return showToast("Set up MFA first via the MFA Setup page", "error");
        setMfaToggling(true);
        try {
            const res = await fetch("/api/settings/security/mfa", {
                method: "PUT",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.detail || "Failed to toggle MFA");
            }
            const data = await res.json();
            setSecurity(s => s ? { ...s, mfa_enabled: data.mfa_enabled } : s);
            showToast(`MFA ${data.mfa_enabled ? "enabled" : "disabled"}`, "success");
        } catch (e: any) {
            showToast(e?.message ?? "MFA toggle failed", "error");
        } finally { setMfaToggling(false); }
    };

    const handleLogout = async (sessionId: string) => {
        setLogoutSessionId(sessionId);
        try {
            await logoutDevice(sessionId);
            setSecurity(s => s ? { ...s, active_sessions: s.active_sessions.filter(x => x.session_id !== sessionId) } : s);
            showToast("Session logged out", "success");
        } catch {
            showToast("Failed to log out session", "error");
        } finally { setLogoutSessionId(null); }
    };

    const strength = getPasswordStrength(pwForm.new_password);
    const pwValid = pwForm.new_password.length >= 8 && /[A-Z]/.test(pwForm.new_password) && /[a-z]/.test(pwForm.new_password) && /[0-9]/.test(pwForm.new_password);
    const pwMatch = pwForm.new_password === pwForm.confirm_password && pwForm.confirm_password.length > 0;

    if (loading) return (
        <div className="flex items-center justify-center h-48 text-foreground/40">
            <Loader2 size={24} className="animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Password */}
            <Section title="Change Password" icon={Lock} accent="#a855f7">
                <div className="space-y-4">
                    <Field label="Current Password">
                        <div className="relative">
                            <Input type={showPw.cur ? "text" : "password"} value={pwForm.current_password}
                                onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                                placeholder="Enter current password" />
                            <button type="button" onClick={() => setShowPw(s => ({ ...s, cur: !s.cur }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70">
                                {showPw.cur ? <EyeOff size={14} /> : <EyeIcon size={14} />}
                            </button>
                        </div>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="New Password">
                            <div className="relative">
                                <Input type={showPw.new ? "text" : "password"} value={pwForm.new_password}
                                    onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                                    placeholder="At least 8 characters" />
                                <button type="button" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70">
                                    {showPw.new ? <EyeOff size={14} /> : <EyeIcon size={14} />}
                                </button>
                            </div>
                            <PasswordStrengthBar password={pwForm.new_password} />
                        </Field>
                        <Field label="Confirm New Password">
                            <div className="relative">
                                <Input type={showPw.conf ? "text" : "password"} value={pwForm.confirm_password}
                                    onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
                                    placeholder="Re-enter new password"
                                    className={cn(pwForm.confirm_password && (pwMatch ? "border-green-500/50" : "border-red-500/50"))}
                                />
                                <button type="button" onClick={() => setShowPw(s => ({ ...s, conf: !s.conf }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70">
                                    {showPw.conf ? <EyeOff size={14} /> : <EyeIcon size={14} />}
                                </button>
                            </div>
                            {pwForm.confirm_password && (
                                <p className={cn("text-xs mt-1", pwMatch ? "text-green-500" : "text-red-500")}>
                                    {pwMatch ? "âœ“ Passwords match" : "âœ— Passwords do not match"}
                                </p>
                            )}
                        </Field>
                    </div>
                    {/* Requirements */}
                    {pwForm.new_password && (
                        <div className="text-xs text-foreground/50 grid grid-cols-2 gap-1">
                            {[
                                { ok: pwForm.new_password.length >= 8, label: "8+ characters" },
                                { ok: /[A-Z]/.test(pwForm.new_password), label: "Uppercase letter" },
                                { ok: /[a-z]/.test(pwForm.new_password), label: "Lowercase letter" },
                                { ok: /[0-9]/.test(pwForm.new_password), label: "Number" },
                            ].map(({ ok, label }) => (
                                <span key={label} className={cn("flex items-center gap-1", ok ? "text-green-500" : "text-foreground/40")}>
                                    {ok ? <Check size={11} /> : <span className="w-[11px] inline-block" />} {label}
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-end">
                        <button
                            onClick={handlePasswordSave}
                            disabled={pwSaving || !pwForm.current_password || !pwValid || !pwMatch}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40"
                        >
                            {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                            Update Password
                        </button>
                    </div>
                </div>
            </Section>

            {/* MFA */}
            <Section title="Two-Factor Authentication" icon={Shield} accent="#10b981">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <p className="text-sm text-foreground/70">
                            Add an extra layer of security by requiring a verification code on every sign-in.
                        </p>
                        {security && !security.mfa_configured && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                <AlertTriangle size={13} />
                                MFA not configured.{" "}
                                <Link href="/settings/mfa" className="underline hover:text-amber-400 transition">
                                    Set up MFA â†’
                                </Link>
                            </div>
                        )}
                        {security?.mfa_configured && (
                            <p className="text-xs text-foreground/40 mt-1">
                                Status: <span className={cn("font-medium", security.mfa_enabled ? "text-green-500" : "text-foreground/60")}>
                                    {security.mfa_enabled ? "Enabled âœ“" : "Configured but disabled"}
                                </span>
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {mfaToggling ? <Loader2 size={18} className="animate-spin text-foreground/40" /> : (
                            <Toggle checked={security?.mfa_enabled ?? false} onChange={handleMfaToggle} disabled={!security?.mfa_configured} />
                        )}
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-foreground/8">
                    <Link href="/settings/mfa" className="inline-flex items-center gap-2 text-xs text-blue-500 hover:text-blue-400 transition font-medium">
                        <KeyRound size={13} /> {security?.mfa_configured ? "Manage MFA & Backup Codes" : "Configure MFA Setup Wizard"} <ExternalLink size={11} />
                    </Link>
                </div>
            </Section>

            {/* Active Sessions */}
            <Section title="Active Sessions" icon={Smartphone} accent="#f59e0b">
                <p className="text-sm text-foreground/50 mb-4">Devices currently signed in to your account.</p>
                {security?.active_sessions.length ? (
                    <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-2 px-2 mb-1">
                            {["Device", "Location", "Last Active", ""].map(h => (
                                <span key={h} className="text-xs font-medium text-foreground/40">{h}</span>
                            ))}
                        </div>
                        {security.active_sessions.map((s) => (
                            <div key={s.session_id} className="grid grid-cols-4 gap-2 items-center px-4 py-3 rounded-xl border border-foreground/8 bg-foreground/[0.02]">
                                <div className="flex items-center gap-2">
                                    <Smartphone size={14} className="text-foreground/40 shrink-0" />
                                    <span className="text-sm text-foreground truncate">{s.device_name}</span>
                                </div>
                                <span className="text-sm text-foreground/60 truncate">{s.location}</span>
                                <span className={cn("text-sm", s.last_active === "Online" ? "text-green-500" : "text-foreground/60")}>
                                    {s.last_active}
                                </span>
                                {s.is_current ? (
                                    <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Current
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleLogout(s.session_id)}
                                        disabled={logoutSessionId === s.session_id}
                                        className="text-xs px-2.5 py-1 rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500/25 transition font-medium disabled:opacity-40"
                                    >
                                        {logoutSessionId === s.session_id ? <Loader2 size={11} className="animate-spin inline" /> : "Log out"}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-foreground/40 text-center py-6">No active sessions found.</p>
                )}
            </Section>

            {toast && <ToastBar toast={toast} />}
        </div>
    );
}
// PART 2 â€” appended to settings/page.tsx
// Notifications, Privacy, Help tabs + main SettingsPage export

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// NOTIFICATIONS TAB
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function NotificationsTab() {
    const [form, setForm] = useState<NotificationPrefs>({ daily_submission_reminder: false, weekly_submission_reminder: false, timesheet_approved: true, timesheet_rejected: true, manager_comment_alerts: true, weekly_summary_email: false, security_alerts: true });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);

    const showToast = (msg: string, type: ToastType = "success") => {
        setToast({ msg, type });
        if (type !== "loading") setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        getNotificationPrefs().then(d => setForm(d)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        showToast("Savingâ€¦", "loading");
        try {
            const updated = await updateNotificationPrefs(form);
            setForm(updated);
            showToast("Notification preferences saved!", "success");
        } catch { showToast("Failed to save", "error"); }
        finally { setSaving(false); }
    };

    const NOTIF_ITEMS: Array<{ key: keyof NotificationPrefs; label: string; desc: string; color: string }> = [
        { key: "daily_submission_reminder", label: "Daily Submission Reminder", desc: "Get notified if you forget to log time for the day.", color: "#3b82f6" },
        { key: "weekly_submission_reminder", label: "Weekly Submission Reminder", desc: "Receive a reminder before weekly timesheet submission deadline.", color: "#8b5cf6" },
        { key: "timesheet_approved", label: "Timesheet Approved", desc: "Get notified when your submitted timesheet is approved by a manager.", color: "#10b981" },
        { key: "timesheet_rejected", label: "Timesheet Rejected", desc: "Receive an alert if your timesheet requires changes or revision.", color: "#ef4444" },
        { key: "manager_comment_alerts", label: "Manager Comment Alerts", desc: "Be notified when your manager adds comments to your submissions.", color: "#f59e0b" },
        { key: "weekly_summary_email", label: "Weekly Summary Email", desc: "Get a weekly digest of your logged hours and approval status.", color: "#ec4899" },
        { key: "security_alerts", label: "Security Alerts", desc: "Receive alerts for new logins, password changes, or security events.", color: "#a855f7" },
    ];

    if (loading) return <div className="flex items-center justify-center h-40 text-foreground/40"><Loader2 size={22} className="animate-spin" /></div>;

    const activeCount = Object.values(form).filter(Boolean).length;

    return (
        <div className="space-y-6">
            <Section title={`Notification Preferences â€” ${activeCount} of ${NOTIF_ITEMS.length} active`} icon={Bell} accent="#f59e0b">
                <p className="text-sm text-foreground/50 mb-5">Control how and when you receive updates about timesheets, approvals, and account activity.</p>
                <div className="space-y-1">
                    {NOTIF_ITEMS.map(item => (
                        <div key={item.key} className="flex items-center justify-between py-4 border-b border-foreground/8 last:border-b-0 gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: item.color }} />
                                <div>
                                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                                    <p className="text-xs text-foreground/50 mt-0.5">{item.desc}</p>
                                </div>
                            </div>
                            <Toggle checked={form[item.key]} onChange={v => setForm(f => ({ ...f, [item.key]: v }))} />
                        </div>
                    ))}
                </div>
                <SaveRow loading={saving} onClick={handleSave} />
            </Section>
            {toast && <ToastBar toast={toast} />}
        </div>
    );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PRIVACY TAB
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function PrivacyTab() {
    const [form, setForm] = useState<PrivacySettings>({ show_online_status: true, display_last_active_time: true });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);

    const showToast = (msg: string, type: ToastType = "success") => {
        setToast({ msg, type });
        if (type !== "loading") setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        getPrivacySettings().then(d => setForm(d)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        showToast("Savingâ€¦", "loading");
        try {
            const updated = await updatePrivacySettings(form);
            setForm(updated);
            showToast("Privacy settings saved!", "success");
        } catch { showToast("Failed to save", "error"); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="flex items-center justify-center h-40 text-foreground/40"><Loader2 size={22} className="animate-spin" /></div>;

    const PRIVACY_ITEMS: Array<{ key: keyof PrivacySettings; label: string; desc: string }> = [
        { key: "show_online_status", label: "Show Online Status", desc: "Allow other team members to see when you are currently active in the system." },
        { key: "display_last_active_time", label: "Display Last Active Time", desc: "Show the timestamp of when you were last logged in to colleagues and managers." },
    ];

    return (
        <div className="space-y-6">
            <Section title="Activity & Presence" icon={Eye} accent="#10b981">
                <p className="text-sm text-foreground/50 mb-5">Control your visibility to other users within the organisation.</p>
                <div className="space-y-1">
                    {PRIVACY_ITEMS.map(item => (
                        <div key={item.key} className="flex items-center justify-between py-4 border-b border-foreground/8 last:border-b-0 gap-4">
                            <div>
                                <p className="text-sm font-medium text-foreground">{item.label}</p>
                                <p className="text-xs text-foreground/50 mt-0.5">{item.desc}</p>
                            </div>
                            <Toggle checked={form[item.key]} onChange={v => setForm(f => ({ ...f, [item.key]: v }))} />
                        </div>
                    ))}
                </div>
                <SaveRow loading={saving} onClick={handleSave} />
            </Section>
            <Section title="Data & Compliance" icon={FileText} accent="#8b5cf6">
                <p className="text-sm text-foreground/50 mb-4">Manage your GDPR and data privacy settings on the dedicated compliance page.</p>
                <Link href="/privacy" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-foreground/15 text-foreground text-sm hover:bg-foreground/5 transition">
                    <Shield size={14} className="text-foreground/50" />
                    Manage GDPR & Data Privacy
                    <ExternalLink size={13} className="text-foreground/40" />
                </Link>
            </Section>
            {toast && <ToastBar toast={toast} />}
        </div>
    );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HELP TAB
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function HelpAccordion({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-foreground/10 rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-foreground/[0.03] transition text-left" onClick={() => setOpen(o => !o)}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                        <Icon size={16} style={{ color }} />
                    </div>
                    <span className="font-medium text-foreground text-sm">{title}</span>
                </div>
                {open ? <ChevronUp size={16} className="text-foreground/40 shrink-0" /> : <ChevronDown size={16} className="text-foreground/40 shrink-0" />}
            </button>
            {open && (
                <div className="px-5 pb-5 border-t border-foreground/8 bg-foreground/[0.015]">
                    <div className="pt-4 text-sm text-foreground/70 leading-relaxed space-y-3">{children}</div>
                </div>
            )}
        </div>
    );
}
function HS({ n, text }: { n: number; text: string }) {
    return (
        <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
            <p>{text}</p>
        </div>
    );
}
function HT({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-2 text-xs bg-blue-500/8 border border-blue-500/20 text-blue-400 rounded-lg px-3 py-2 mt-1">
            <Info size={13} className="shrink-0 mt-0.5" />{text}
        </div>
    );
}

function HelpTab() {
    return (
        <div className="space-y-4">
            <div className="rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-foreground/10 px-6 py-5">
                <div className="flex items-center gap-3 mb-2">
                    <BookOpen size={20} className="text-blue-400" />
                    <h2 className="font-bold text-foreground text-base">LightIDEA Help Centre</h2>
                </div>
                <p className="text-sm text-foreground/60">Everything you need to know. Click any category to expand step-by-step instructions.</p>
            </div>

            <HelpAccordion title="Getting Started" icon={Info} color="#3b82f6">
                <HS n={1} text="Log in with your email and password. Your organisation may also support Google or Microsoft SSO â€” click respective button on the login page." />
                <HS n={2} text="After login, the Home dashboard shows pending timesheets, recent activity, and important quick actions. Check the header for notifications." />
                <HS n={3} text="The left sidebar (icons column) lets you navigate the entire app. Hover any icon to see its name tooltip." />
                <HS n={4} text="Go to Settings â†’ Profile to fill in your name, phone number, bio, emergency contact, and address. A complete profile helps managers identify you in reports." />
                <HT text="New users: complete your profile first â€” it appears in timesheets, reports, and org charts." />
            </HelpAccordion>

            <HelpAccordion title="Timesheets (My Time)" icon={Clock} color="#10b981">
                <HS n={1} text="Click 'My Time' (clock icon) in the bottom sidebar to open your personal timesheet view." />
                <HS n={2} text="Select a week using the date picker. The calendar shows days you have or have not logged time." />
                <HS n={3} text="Click '+ Add Entry' to log time: choose a Project, a Task within that project, enter the number of hours, and optionally add a note." />
                <HS n={4} text="Click 'Submit Week' when your timesheet for the week is complete. This sends it to your manager for review." />
                <HS n={5} text="Your manager will Approve or Reject the submission. If rejected, open the timesheet, make corrections suggested in the comments, and resubmit." />
                <HS n={6} text="Track your approval status on the dashboard. Approved hours feed into payroll and project cost reports." />
                <HT text="Turn on 'Daily Submission Reminder' in Settings â†’ Notifications to get an alert if you forget to log time each day." />
            </HelpAccordion>

            <HelpAccordion title="Projects & Tasks" icon={FolderKanban} color="#8b5cf6">
                <HS n={1} text="Click 'Projects' (folder icon) in the top sidebar. You see all projects you are a member of or have visibility into." />
                <HS n={2} text="Click a project card to enter it. You get a full overview: tasks, milestones, members, deadlines, and a Gantt-like timeline." />
                <HS n={3} text="Admins and Project Managers can click '+ New Project', fill in the name, client billing, deadline, and assign team members." />
                <HS n={4} text="Tasks inside a project can be viewed in three modes: List (spreadsheet-like), Kanban (drag-and-drop status columns), or Swimlane (by assignee)." />
                <HS n={5} text="Use the filter bar (funnel icon) to search or filter tasks by assignee, status, priority, tag, or due date." />
                <HS n={6} text="Tasks support: sub-tasks, attachments, comments, time tracking, custom fields, and dependency links (blocks / is blocked by)." />
                <HT text="Create Project Templates in the Templates section so future similar projects can be set up in seconds." />
            </HelpAccordion>

            <HelpAccordion title="Teams & Departments" icon={Users} color="#f59e0b">
                <HS n={1} text="Find Departments and Teams inside 'Operation' in the top sidebar." />
                <HS n={2} text="Departments represent your organisation's structural units (e.g., Engineering, Finance). Each has a head and a list of employees." />
                <HS n={3} text="Teams are task-focused groups that can span departments. A team is assigned to one or more projects." />
                <HS n={4} text="Admins can create a new Department or Team by clicking '+ New â€¦' and filling in the details." />
                <HS n={5} text="Assign a Team Lead to give someone management-level visibility over that team's tasks and timesheets." />
                <HT text="Department assignments affect capacity planning charts and org-wide analytics breakdowns." />
            </HelpAccordion>

            <HelpAccordion title="Employees & Clients" icon={Users} color="#ec4899">
                <HS n={1} text="Go to Operation â†’ Employees to view all staff. Click a card to see their profile, assigned projects, role, and weekly capacity." />
                <HS n={2} text="Admins: click '+ Invite Employee', enter their email and role. They will receive an email invite to create their account." />
                <HS n={3} text="Operation â†’ Clients shows all client organisations. Each client has contact info, billing type, currency, and linked projects." />
                <HS n={4} text="Create a new Client by clicking '+ New Client'. Assign projects to them for accurate billing and reporting." />
                <HS n={5} text="Workspaces (Operation â†’ Workspaces) are logical containers â€” useful for separating divisions or large clients within one platform instance." />
            </HelpAccordion>

            <HelpAccordion title="Reports & Analytics" icon={BarChart2} color="#3b82f6">
                <HS n={1} text="Open Reports â†’ Analytics from the sidebar. The dashboard displays charts for hours logged, approval rates, project progress, and top projects by hours." />
                <HS n={2} text="Adjust the date range and apply filters (by employee, department, project) to drill into specific data." />
                <HS n={3} text="Click Download to export any report as a PDF or CSV file for external use." />
                <HS n={4} text="Scheduled Reports (Reports â†’ Scheduled): create automated recurring reports (daily, weekly, monthly) that get emailed to you automatically." />
                <HS n={5} text="Manager View (Dashboards â†’ Manager View): see team-level timesheets, pending approvals, and performance metrics all in one place." />
                <HT text="Employees only see their own data. Managers see their direct reports. Admins see everything." />
            </HelpAccordion>

            <HelpAccordion title="Templates (Tasks & Projects)" icon={FileText} color="#6366f1">
                <HS n={1} text="Open 'Templates' from the sidebar. Two template types exist: Task Templates and Project Templates." />
                <HS n={2} text="Task Templates pre-fill a task's name, description, priority, tags, checklist items, and estimated hours â€” saving time for common recurring tasks." />
                <HS n={3} text="Project Templates capture an entire project setup: phases, task groups, pre-built tasks, and suggested team roles." />
                <HS n={4} text="When creating a new Project or Task, click 'Use Template' and select the appropriate template from the list." />
                <HT text="Build templates for your most common project types (e.g., Software Release, Client Onboarding) to ensure consistency." />
            </HelpAccordion>

            <HelpAccordion title="Automation Rules" icon={Zap} color="#f59e0b">
                <HS n={1} text="Click 'Automation' in the sidebar. You will see a list of your current automation rules." />
                <HS n={2} text="Click '+ New Rule'. Every rule has a Trigger (when something happens) and an Action (what to do in response)." />
                <HS n={3} text="Example triggers: 'Task status changes to Done', 'Timesheet submitted', 'Due date is 2 days away'." />
                <HS n={4} text="Example actions: 'Send email notification', 'Assign task to user', 'Create a new sub-task', 'Change priority to High'." />
                <HS n={5} text="Rules can be toggled on/off from the list view anytime without deleting them." />
                <HT text="Start simple â€” one or two rules first, such as notifying a manager when a timesheet is submitted." />
            </HelpAccordion>

            <HelpAccordion title="AI Assistant" icon={BotMessageSquare} color="#a855f7">
                <HS n={1} text="Click 'AI' (robot icon) in the sidebar to open the AI chat panel." />
                <HS n={2} text="Type any question about your projects, tasks, time entries, team workload, or ask it to help write descriptions or summaries." />
                <HS n={3} text="The AI can suggest tasks from a plain-English project description, summarise progress, and help draft approval messages." />
                <HS n={4} text="Voice input: click the microphone icon and speak your query â€” it will be transcribed and sent automatically." />
                <HS n={5} text="Your chat history is saved. Previous conversations can be resumed from the history panel on the left." />
                <HT text="The AI only accesses your organisation's data. Nothing is shared externally." />
            </HelpAccordion>

            <HelpAccordion title="Expenses (My Expense)" icon={Wallet} color="#10b981">
                <HS n={1} text="Click 'My Expense' (wallet icon) in the bottom sidebar." />
                <HS n={2} text="Click '+ Add Expense', select a category (Travel, Meals, Equipment, etc.), enter the amount and currency, add a description, and optionally upload a receipt image." />
                <HS n={3} text="Click 'Submit' to send the expense to your manager for approval." />
                <HS n={4} text="Approved expenses are recorded in admin financial reports and can be extracted for payroll processing." />
                <HS n={5} text="Track your expense history and approval status under the 'My Expenses' tab." />
            </HelpAccordion>

            <HelpAccordion title="Account Security & MFA" icon={Shield} color="#ef4444">
                <HS n={1} text="Change your password in Settings â†’ Security. Requirements: 8+ characters, one uppercase, one lowercase, one number." />
                <HS n={2} text="The password strength meter shows in real time as you type. Aim for 'Good' or 'Strong' before saving." />
                <HS n={3} text="Two-Factor Authentication (MFA): click 'Configure MFA Setup Wizard' in the Security tab to begin setup." />
                <HS n={4} text="During MFA setup, scan the QR code displayed with any authenticator app (Google Authenticator, Microsoft Authenticator, Authy). Enter the 6-digit code to confirm." />
                <HS n={5} text="You will receive Backup Codes after setup â€” store these in a safe place. Each code is single-use and allows login if you lose your device." />
                <HS n={6} text="Active Sessions shows every browser/device that is currently logged in. Click 'Log out' next to any unrecognised session to terminate it immediately." />
                <HT text="Enable MFA for the best protection. It stops attackers even if they steal your password." />
            </HelpAccordion>

            <HelpAccordion title="Support Tickets" icon={HeadsetIcon} color="#6366f1">
                <HS n={1} text="Click 'Support' (headset icon) in the sidebar to open the Support Centre." />
                <HS n={2} text="Click '+ New Ticket', enter a clear title, a detailed description of the issue, and set a priority level (Low / Medium / High / Critical)." />
                <HS n={3} text="Your administrator or support team will be notified and will respond within the agreed SLA." />
                <HS n={4} text="You will receive an in-app notification when your ticket is updated or resolved." />
                <HS n={5} text="The ticket list shows all your past requests with their current status: Open, In Progress, On Hold, or Resolved." />
            </HelpAccordion>

            <HelpAccordion title="Integrations & API Keys" icon={Link2} color="#ec4899">
                <HS n={1} text="Go to /integrations (click the Integrations card on the Settings page) to see all available connectors." />
                <HS n={2} text="Available integrations include: calendar sync (Google / Outlook), Slack/Teams notifications, and REST API access." />
                <HS n={3} text="To create an API Key: navigate to Integrations â†’ API Keys, click '+ Generate Key', give it a label, and copy it immediately (it is shown only once)." />
                <HS n={4} text="API keys have the same permissions as your account. Keep them secret and revoke any that are no longer needed." />
                <HT text="Use API keys to connect external BI tools, mobile apps, or custom scripts to your LightIDEA workspace data." />
            </HelpAccordion>

            <HelpAccordion title="Navigation & Quick Tips" icon={KeyRound} color="#f59e0b">
                <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                    {[
                        ["Home / Dashboard", "House icon at top of sidebar"],
                        ["My Timesheets", "Clock icon at bottom of sidebar"],
                        ["My Expenses", "Wallet icon at bottom of sidebar"],
                        ["Settings", "Gear icon at bottom of sidebar"],
                        ["Help (this page)", "Question mark icon at bottom of sidebar"],
                        ["Switch Themes", "Theme toggle in the top header bar"],
                        ["Global Search", "Search / magnifier icon in top header"],
                        ["Notifications Bell", "Bell icon in the top header area"],
                        ["Close Modals / Drawers", "Press Escape or click the Ã— button"],
                        ["Log Out", "Avatar / profile dropdown â†’ Log Out"],
                    ].map(([action, shortcut]) => (
                        <div key={action} className="flex flex-col py-2.5 border-b border-foreground/8 last:border-b-0">
                            <span className="font-medium text-foreground text-xs">{action}</span>
                            <span className="text-foreground/50 mt-0.5 text-xs">{shortcut}</span>
                        </div>
                    ))}
                </div>
            </HelpAccordion>
        </div>
    );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function SettingsPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const getInitialTab = (): TabId => {
        const tab = searchParams.get("tab") as TabId;
        return TABS.some(t => t.id === tab) ? tab : "profile";
    };

    const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
    const [profile, setProfile] = useState<SettingsProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    useEffect(() => {
        const tab = searchParams.get("tab") as TabId;
        if (tab && TABS.some(t => t.id === tab)) setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        getSettingsProfile().then(setProfile).catch(() => { }).finally(() => setProfileLoading(false));
    }, []);

    const switchTab = (id: TabId) => {
        setActiveTab(id);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", id);
        router.replace(url.pathname + url.search, { scroll: false });
    };

    return (
        <div className="max-w-[900px] mx-auto space-y-6 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-sm text-foreground/50 mt-1">Manage your profile, security, notifications, and preferences.</p>
            </div>

            {/* Tab Bar */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-foreground/10 bg-foreground/[0.02] overflow-x-auto no-scrollbar">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => switchTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
                                isActive
                                    ? "bg-background text-foreground shadow-sm border border-foreground/10"
                                    : "text-foreground/50 hover:text-foreground hover:bg-foreground/[0.04]"
                            )}
                        >
                            <Icon size={15} style={isActive ? { color: tab.color } : {}} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === "profile" && (
                profileLoading
                    ? <div className="flex items-center justify-center h-48 text-foreground/40"><Loader2 size={22} className="animate-spin" /></div>
                    : <ProfileTab profile={profile} onUpdate={setProfile} />
            )}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "notifications" && <NotificationsTab />}
            {activeTab === "privacy" && <PrivacyTab />}
            {activeTab === "help" && <HelpTab />}
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-48 text-foreground/40">
                <Loader2 size={22} className="animate-spin" />
            </div>
        }>
            <SettingsPageInner />
        </Suspense>
    );
}

