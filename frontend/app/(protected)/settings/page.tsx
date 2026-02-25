"use client";

import { useState, useEffect, useCallback } from "react";
import {
    User, Shield, Bell, Eye, ChevronRight, X, Camera,
    Lock, Smartphone, LogOut, Eye as EyeIcon, EyeOff,
    Save, AlertTriangle, CheckCircle, Loader2
} from "lucide-react";
import {
    getSettingsProfile, updateSettingsProfile,
    getSecuritySettings, changePassword, logoutDevice,
    getNotificationPrefs, updateNotificationPrefs,
    getPrivacySettings, updatePrivacySettings,
    SettingsProfile, SecuritySettings, NotificationPrefs, PrivacySettings,
    DeviceSession
} from "@/services/settings";
import { useRouter } from "next/navigation";

// ─── helpers ──────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]) {
    return classes.filter(Boolean).join(" ");
}

function avatar(name: string) {
    return name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

// ─── Toast ────────────────────────────────────────────────

type ToastType = "success" | "error" | "loading";
interface Toast { msg: string; type: ToastType }

function ToastBar({ toast }: { toast: Toast }) {
    const colors: Record<ToastType, string> = {
        success: "bg-green-500/90",
        error: "bg-red-500/90",
        loading: "bg-blue-500/90",
    };
    return (
        <div className={cn("fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl text-white shadow-2xl text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300", colors[toast.type])}>
            {toast.type === "loading" && <Loader2 size={16} className="animate-spin" />}
            {toast.type === "success" && <CheckCircle size={16} />}
            {toast.type === "error" && <AlertTriangle size={16} />}
            {toast.msg}
        </div>
    );
}

// ─── Modal wrapper ────────────────────────────────────────

function Modal({ open, onClose, title, subtitle, children }: {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col rounded-2xl border border-foreground/10 bg-background shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between px-7 pt-7 pb-4 border-b border-foreground/8">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                        {subtitle && <p className="text-sm text-foreground/50 mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-foreground/10 text-foreground/50 hover:text-foreground transition"
                    >
                        <X size={16} />
                    </button>
                </div>
                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-7 py-5">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ─── Toggle ───────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30",
                checked ? "bg-blue-600" : "bg-foreground/20"
            )}
        >
            <span
                className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                    checked ? "translate-x-6" : "translate-x-0"
                )}
            />
        </button>
    );
}

// ─── Form Input ───────────────────────────────────────────

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
            className={cn(
                "w-full px-3 py-2.5 rounded-lg border border-foreground/15 bg-foreground/[0.04] text-foreground placeholder:text-foreground/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition",
                className
            )}
        />
    );
}

function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={cn(
                "w-full px-3 py-2.5 rounded-lg border border-foreground/15 bg-foreground/[0.04] text-foreground placeholder:text-foreground/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition resize-none",
                className
            )}
        />
    );
}

// ─── Confirm Dialog ───────────────────────────────────────

function ConfirmDialog({ open, onConfirm, onCancel, title, message }: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
            <div className="relative z-10 w-80 rounded-2xl border border-foreground/10 bg-background p-6 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-orange-500/15 flex items-center justify-center mx-auto mb-4">
                    <Save size={22} className="text-orange-400" />
                </div>
                <h3 className="font-semibold text-foreground text-center mb-2">{title}</h3>
                <p className="text-sm text-foreground/55 text-center mb-6">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2 rounded-lg border border-foreground/15 text-foreground text-sm font-medium hover:bg-foreground/5 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Save Button ──────────────────────────────────────────

function SaveBtn({ loading, onClick }: { loading: boolean; onClick: () => void }) {
    return (
        <div className="flex justify-end mt-6 pt-4 border-t border-foreground/8">
            <button
                onClick={onClick}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
            </button>
        </div>
    );
}

// ─── LogOut Confirm ───────────────────────────────────────

function LogoutDeviceConfirm({ session, onConfirm, onCancel }: {
    session: DeviceSession | null;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!session) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
            <div className="relative z-10 w-80 rounded-2xl border border-foreground/10 bg-background p-6 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                    <LogOut size={22} className="text-red-400" />
                </div>
                <h3 className="font-semibold text-foreground text-center mb-2">Log Out From This Device?</h3>
                <p className="text-sm text-foreground/55 text-center mb-6">
                    You are about to remotely log out from <strong className="text-foreground">{session.device_name}</strong>. The session will be terminated immediately.
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-foreground/15 text-foreground text-sm font-medium hover:bg-foreground/5 transition">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition">
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════

type ModalType = "profile" | "security" | "notifications" | "privacy" | null;

export default function SettingsPage() {
    const router = useRouter();
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [toast, setToast] = useState<Toast | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingSave, setPendingSave] = useState<(() => void) | null>(null);
    const [saving, setSaving] = useState(false);

    // Data states
    const [profile, setProfile] = useState<SettingsProfile | null>(null);
    const [security, setSecurity] = useState<SecuritySettings | null>(null);
    const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);
    const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // Profile edit form
    const [profileForm, setProfileForm] = useState({
        full_name: "",
        phone: "",
        employee_id_display: "",
        emergency_contact_name: "",
        emergency_contact_no: "",
        bio: "",
        city: "",
        pincode: "",
        tax_address: "",
    });

    // Security form
    const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
    const [showPw, setShowPw] = useState({ cur: false, new: false, conf: false });
    const [mfaToggling, setMfaToggling] = useState(false);
    const [logoutSession, setLogoutSession] = useState<DeviceSession | null>(null);

    // Notification prefs edit
    const [notifForm, setNotifForm] = useState<NotificationPrefs>({
        daily_submission_reminder: false,
        weekly_submission_reminder: false,
        timesheet_approved: false,
        timesheet_rejected: false,
        manager_comment_alerts: false,
        weekly_summary_email: false,
        security_alerts: false,
    });

    // Privacy edit
    const [privacyForm, setPrivacyForm] = useState<PrivacySettings>({
        show_online_status: true,
        display_last_active_time: true,
    });

    const showToast = useCallback((msg: string, type: ToastType = "success") => {
        setToast({ msg, type });
        if (type !== "loading") {
            setTimeout(() => setToast(null), 3000);
        }
    }, []);

    // ── Load profile (always shown on the index card) ──────

    useEffect(() => {
        setProfileLoading(true);
        getSettingsProfile()
            .then((d) => {
                setProfile(d);
                setProfileForm({
                    full_name: d.full_name ?? "",
                    phone: d.phone ?? "",
                    employee_id_display: d.employee_id_display ?? "",
                    emergency_contact_name: d.emergency_contact_name ?? "",
                    emergency_contact_no: d.emergency_contact_no ?? "",
                    bio: d.bio ?? "",
                    city: d.city ?? "",
                    pincode: d.pincode ?? "",
                    tax_address: d.tax_address ?? "",
                });
            })
            .catch(() => { /* silently fail */ })
            .finally(() => setProfileLoading(false));
    }, []);

    // ── Lazy-load on modal open ────────────────────────────

    useEffect(() => {
        if (activeModal === "security" && !security) {
            getSecuritySettings().then(setSecurity).catch(() => { });
        }
        if (activeModal === "notifications" && !notifPrefs) {
            getNotificationPrefs().then((d) => {
                setNotifPrefs(d);
                setNotifForm(d);
            }).catch(() => { });
        }
        if (activeModal === "privacy" && !privacy) {
            getPrivacySettings().then((d) => {
                setPrivacy(d);
                setPrivacyForm(d);
            }).catch(() => { });
        }
    }, [activeModal]);

    // ── Handlers ──────────────────────────────────────────

    const askConfirm = (fn: () => void) => {
        setPendingSave(() => fn);
        setConfirmOpen(true);
    };

    const runSave = async () => {
        setConfirmOpen(false);
        if (!pendingSave) return;
        setSaving(true);
        showToast("Saving…", "loading");
        try {
            await pendingSave();
            showToast("Changes saved!", "success");
        } catch {
            showToast("Failed to save changes", "error");
        } finally {
            setSaving(false);
        }
    };

    // Profile save
    const handleProfileSave = () => {
        askConfirm(async () => {
            const updated = await updateSettingsProfile(profileForm);
            setProfile(updated);
            setActiveModal(null);
        });
    };

    // Password change
    const handlePasswordSave = () => {
        askConfirm(async () => {
            await changePassword(pwForm);
            setPwForm({ current_password: "", new_password: "", confirm_password: "" });
        });
    };

    // MFA toggle
    const handleMfaToggle = async () => {
        setMfaToggling(true);
        try {
            const res = await fetch("/api/settings/security/mfa", {
                method: "PUT",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setSecurity((s) => s ? { ...s, mfa_enabled: data.mfa_enabled } : s);
            showToast(`MFA ${data.mfa_enabled ? "enabled" : "disabled"}`, "success");
        } catch {
            showToast("MFA: Please configure MFA first via the setup flow.", "error");
        } finally {
            setMfaToggling(false);
        }
    };

    // Logout device
    const confirmLogout = async () => {
        if (!logoutSession) return;
        try {
            await logoutDevice(logoutSession.device_name);
            setSecurity((s) => s ? {
                ...s,
                active_sessions: s.active_sessions.filter(
                    (x) => x.device_name !== logoutSession.device_name
                )
            } : s);
            showToast("Device logged out", "success");
        } catch {
            showToast("Failed to log out device", "error");
        } finally {
            setLogoutSession(null);
        }
    };

    // Notification save
    const handleNotifSave = () => {
        askConfirm(async () => {
            const updated = await updateNotificationPrefs(notifForm);
            setNotifPrefs(updated);
            setNotifForm(updated);
            setActiveModal(null);
        });
    };

    // Privacy save
    const handlePrivacySave = () => {
        askConfirm(async () => {
            const updated = await updatePrivacySettings(privacyForm);
            setPrivacy(updated);
            setPrivacyForm(updated);
            setActiveModal(null);
        });
    };

    // ── Card data ─────────────────────────────────────────

    const notifActiveCount = notifPrefs
        ? Object.values(notifPrefs).filter(Boolean).length
        : 0;
    const secMeta = security
        ? `${security.active_sessions.length} active session${security.active_sessions.length !== 1 ? "s" : ""}`
        : "2 active sessions";

    const CARDS = [
        {
            key: "profile" as ModalType,
            title: "Profile Information",
            description: "Update your personal details and correct information.",
            color: "#3b82f6",
            meta: profile?.updated_at
                ? `Last updated ${new Date(profile.updated_at).toLocaleDateString()}`
                : "Last updated 5 days ago",
        },
        {
            key: "security" as ModalType,
            title: "Security Settings Card",
            description: "Manage password, login sessions, and account protection.",
            color: "#a855f7",
            meta: secMeta,
        },
        {
            key: "notifications" as ModalType,
            title: "Notifications",
            description: "Control email reminders and approval alerts.",
            color: "#f59e0b",
            meta: `${notifActiveCount} active preferences`,
        },
        {
            key: "privacy" as ModalType,
            title: "Privacy Settings",
            description: "Control visibility of your timesheet and profile.",
            color: "#10b981",
            meta: "Last updated 5 days ago",
        },
        {
            key: "integrations" as any,
            title: "Integrations",
            description: "Manage connected services, API keys, and third-party tools.",
            color: "#ec4899",
            meta: "Connect your tools",
            href: "/integrations",
        },
    ];

    // ── Render ────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-[900px] mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">My Settings</h1>
                <p className="text-sm text-foreground/50 mt-1">
                    Manage your personal preferences, account security, and system experience.
                </p>
            </div>

            {/* Settings Cards */}
            <div className="space-y-4">
                {CARDS.map((card) => (
                    <button
                        key={card.key}
                        onClick={() => {
                            if (card.href) {
                                router.push(card.href);
                            } else {
                                setActiveModal(card.key);
                            }
                        }}
                        className="w-full text-left group rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.05] transition-all duration-200 p-5 cursor-pointer"
                    >
                        <div className="flex items-start gap-4">
                            <div
                                className="w-1 self-stretch rounded-full shrink-0"
                                style={{ backgroundColor: card.color }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-foreground group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                        {card.title}
                                    </h3>
                                    <ChevronRight size={16} className="text-foreground/30 group-hover:text-foreground/60 transition-colors shrink-0" />
                                </div>
                                <p className="text-sm text-foreground/50 mt-0.5">{card.description}</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-xs text-foreground/40">{card.meta}</span>
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* ══ PROFILE MODAL ══════════════════════════════ */}
            <Modal
                open={activeModal === "profile"}
                onClose={() => setActiveModal(null)}
                title="Edit Profile Information"
                subtitle="Edit your personal details and correct information."
            >
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                            {profile ? avatar(profile.full_name) : "—"}
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition">
                            <Camera size={11} />
                        </button>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                        <p className="text-xs text-foreground/45">{profile?.email}</p>
                        <p className="text-xs text-foreground/45">{profile?.role}</p>
                    </div>
                </div>

                {/* Basic Info */}
                <p className="text-xs font-semibold text-foreground/70 uppercase tracking-widest mb-4">Basic Information</p>
                <div className="grid grid-cols-2 gap-4 mb-5">
                    <Field label="Full Name">
                        <Input
                            value={profileForm.full_name}
                            onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                            placeholder="Your full name"
                        />
                    </Field>
                    <Field label="Employee ID">
                        <Input
                            value={profileForm.employee_id_display}
                            onChange={(e) => setProfileForm((f) => ({ ...f, employee_id_display: e.target.value }))}
                            placeholder="EMP-001"
                        />
                    </Field>
                    <Field label="Email Address">
                        <Input value={profile?.email ?? ""} disabled placeholder="Email" className="opacity-60 cursor-not-allowed" />
                    </Field>
                    <Field label="Phone Number">
                        <Input
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder="+91 00000 00000"
                        />
                    </Field>
                    <Field label="Department">
                        <Input value={profile?.department ?? ""} disabled placeholder="Department" className="opacity-60 cursor-not-allowed" />
                    </Field>
                </div>

                {/* Emergency Contact */}
                <p className="text-xs font-semibold text-foreground/70 uppercase tracking-widest mb-4">Emergency Contact</p>
                <div className="grid grid-cols-2 gap-4 mb-5">
                    <Field label="Emergency Contact Name (Optional)">
                        <Input
                            value={profileForm.emergency_contact_name}
                            onChange={(e) => setProfileForm((f) => ({ ...f, emergency_contact_name: e.target.value }))}
                            placeholder="Enter Emergency Contact Name"
                        />
                    </Field>
                    <Field label="Emergency Contact No. (Optional)">
                        <Input
                            value={profileForm.emergency_contact_no}
                            onChange={(e) => setProfileForm((f) => ({ ...f, emergency_contact_no: e.target.value }))}
                            placeholder="Enter Emergency Contact Number"
                        />
                    </Field>
                </div>

                {/* Description */}
                <div className="mb-5">
                    <Field label="Description (Optional)">
                        <TextArea
                            rows={3}
                            value={profileForm.bio}
                            onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                            placeholder="Business description…"
                        />
                    </Field>
                </div>

                {/* Priority & Scheduling */}
                <p className="text-xs font-semibold text-foreground/70 uppercase tracking-widest mb-4">Priority &amp; Scheduling</p>
                <div className="grid grid-cols-2 gap-4 mb-5">
                    <Field label="City">
                        <Input
                            value={profileForm.city}
                            onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))}
                            placeholder="Enter City"
                        />
                    </Field>
                    <Field label="Enter Pincode">
                        <Input
                            value={profileForm.pincode}
                            onChange={(e) => setProfileForm((f) => ({ ...f, pincode: e.target.value }))}
                            placeholder="000000"
                        />
                    </Field>
                    <Field label="Tax ID / Address (Optional)">
                        <Input
                            value={profileForm.tax_address}
                            onChange={(e) => setProfileForm((f) => ({ ...f, tax_address: e.target.value }))}
                            placeholder="Enter Tax Address"
                            className="col-span-2"
                        />
                    </Field>
                </div>

                <SaveBtn loading={saving} onClick={handleProfileSave} />
            </Modal>

            {/* ══ SECURITY MODAL ═════════════════════════════ */}
            <Modal
                open={activeModal === "security"}
                onClose={() => setActiveModal(null)}
                title="Security &amp; Account Protection"
                subtitle="Manage your password, monitor define sessions, and enhance account security."
            >
                {/* Password Management */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Password Management</p>
                            <p className="text-xs text-foreground/50">Use a strong password to keep your profile secure.</p>
                        </div>
                        <button
                            onClick={() => setPwForm({ current_password: "", new_password: "", confirm_password: "" })}
                            className="text-xs px-3 py-1.5 rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition"
                        >
                            Change Password Alt
                        </button>
                    </div>

                    <div className="space-y-3">
                        <Field label="Current Password">
                            <div className="relative">
                                <Input
                                    type={showPw.cur ? "text" : "password"}
                                    value={pwForm.current_password}
                                    onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                                    placeholder="Enter current password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((s) => ({ ...s, cur: !s.cur }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition"
                                >
                                    {showPw.cur ? <EyeOff size={14} /> : <EyeIcon size={14} />}
                                </button>
                            </div>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="New Password">
                                <div className="relative">
                                    <Input
                                        type={showPw.new ? "text" : "password"}
                                        value={pwForm.new_password}
                                        onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw((s) => ({ ...s, new: !s.new }))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition"
                                    >
                                        {showPw.new ? <EyeOff size={14} /> : <EyeIcon size={14} />}
                                    </button>
                                </div>
                            </Field>
                            <Field label="Confirm New Password">
                                <div className="relative">
                                    <Input
                                        type={showPw.conf ? "text" : "password"}
                                        value={pwForm.confirm_password}
                                        onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw((s) => ({ ...s, conf: !s.conf }))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition"
                                    >
                                        {showPw.conf ? <EyeOff size={14} /> : <EyeIcon size={14} />}
                                    </button>
                                </div>
                            </Field>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={handlePasswordSave}
                                disabled={saving || !pwForm.current_password || !pwForm.new_password}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40"
                            >
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                                Save Password
                            </button>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <hr className="border-foreground/8 my-5" />

                {/* MFA */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Two-Factor Authentication</p>
                        <p className="text-xs text-foreground/50 mt-0.5">Add an extra layer of security by enabling two-factor authentication.</p>
                    </div>
                    {mfaToggling ? (
                        <Loader2 size={18} className="animate-spin text-foreground/40" />
                    ) : (
                        <Toggle
                            checked={security?.mfa_enabled ?? false}
                            onChange={handleMfaToggle}
                        />
                    )}
                </div>

                {/* Active Sessions */}
                <div>
                    <p className="text-sm font-semibold text-foreground mb-3">Active Sessions</p>
                    <p className="text-xs text-foreground/50 mb-3">Your team currently logged in to your account.</p>

                    {security ? (
                        <>
                            <div className="grid grid-cols-4 gap-2 mb-2 px-1">
                                {["Device Name", "Location", "Last Active", ""].map((h) => (
                                    <span key={h} className="text-xs font-medium text-foreground/40">{h}</span>
                                ))}
                            </div>
                            <div className="space-y-2">
                                {security.active_sessions.map((s) => (
                                    <div
                                        key={s.device_name}
                                        className="grid grid-cols-4 gap-2 items-center px-3 py-3 rounded-xl border border-foreground/8 bg-foreground/[0.02]"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Smartphone size={14} className="text-foreground/40 shrink-0" />
                                            <span className="text-sm text-foreground truncate">{s.device_name}</span>
                                        </div>
                                        <span className="text-sm text-foreground/60">{s.location}</span>
                                        <span className={cn("text-sm", s.last_active === "Online" ? "text-green-500" : "text-foreground/60")}>
                                            {s.last_active}
                                        </span>
                                        {s.is_current ? (
                                            <span className="text-xs text-green-500 font-medium">Current</span>
                                        ) : (
                                            <button
                                                onClick={() => setLogoutSession(s)}
                                                className="text-xs px-2.5 py-1 rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500/25 transition font-medium"
                                            >
                                                Log out
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-20 text-foreground/40">
                            <Loader2 size={18} className="animate-spin" />
                        </div>
                    )}

                    <div className="flex justify-end mt-4 pt-4 border-t border-foreground/8">
                        <button
                            onClick={() => setActiveModal(null)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition"
                        >
                            <Save size={14} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ══ NOTIFICATIONS MODAL ════════════════════════ */}
            <Modal
                open={activeModal === "notifications"}
                onClose={() => setActiveModal(null)}
                title="Notification Preferences"
                subtitle="Manage how and when you receive updates about timesheets, approvals, and account activity."
            >
                {notifPrefs === null ? (
                    <div className="flex items-center justify-center h-40 text-foreground/40">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                ) : (
                    <>
                        {([
                            { key: "daily_submission_reminder", label: "Daily Submission Reminder", desc: "Get notified if you forget to log time for the day." },
                            { key: "weekly_submission_reminder", label: "Weekly Submission Reminder", desc: "Receive a reminder before weekly timesheet submission deadline." },
                            { key: "timesheet_approved", label: "Timesheet Approved Notification", desc: "Get notified when your submitted timesheet is approved." },
                            { key: "timesheet_rejected", label: "Timesheet Rejected Notification", desc: "Receive an alert if your timesheet requires changes." },
                            { key: "manager_comment_alerts", label: "Manager Comment Alerts", desc: "Be notified when your manager adds comments to your submission." },
                            { key: "weekly_summary_email", label: "Weekly Summary Email", desc: "Get a summary of your logged hours and approvals." },
                            { key: "security_alerts", label: "Security Alerts", desc: "Receive alerts for new device logins or security changes." },
                        ] as Array<{ key: keyof NotificationPrefs; label: string; desc: string }>).map((item) => (
                            <div
                                key={item.key}
                                className="flex items-center justify-between py-4 border-b border-foreground/8 last:border-b-0"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                                    <p className="text-xs text-foreground/50 mt-0.5">{item.desc}</p>
                                </div>
                                <Toggle
                                    checked={notifForm[item.key]}
                                    onChange={(v) => setNotifForm((f) => ({ ...f, [item.key]: v }))}
                                />
                            </div>
                        ))}

                        <SaveBtn loading={saving} onClick={handleNotifSave} />
                    </>
                )}
            </Modal>

            {/* ══ PRIVACY MODAL ══════════════════════════════ */}
            <Modal
                open={activeModal === "privacy"}
                onClose={() => setActiveModal(null)}
                title="Privacy Settings"
                subtitle="Manage who can view profile visibility within the organization."
            >
                {privacy === null ? (
                    <div className="flex items-center justify-center h-40 text-foreground/40">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                ) : (
                    <>
                        <div className="mb-5">
                            <p className="text-xs font-semibold text-foreground/60 uppercase tracking-widest mb-4">Activity &amp; Presence</p>
                            <p className="text-sm text-foreground/60 mb-4">Control visibility of your activity status.</p>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between py-4 border-b border-foreground/8">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Show Online Status</p>
                                        <p className="text-xs text-foreground/50 mt-0.5">Allow others to see when you are active in the system.</p>
                                    </div>
                                    <Toggle
                                        checked={privacyForm.show_online_status}
                                        onChange={(v) => setPrivacyForm((f) => ({ ...f, show_online_status: v }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between py-4">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Display Last Active Time</p>
                                        <p className="text-xs text-foreground/50 mt-0.5">Show when you were last logged in.</p>
                                    </div>
                                    <Toggle
                                        checked={privacyForm.display_last_active_time}
                                        onChange={(v) => setPrivacyForm((f) => ({ ...f, display_last_active_time: v }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <SaveBtn loading={saving} onClick={handlePrivacySave} />
                    </>
                )}
            </Modal>

            {/* ══ CONFIRM DIALOG ═════════════════════════════ */}
            <ConfirmDialog
                open={confirmOpen}
                title="Save Your Changes?"
                message="You have made changes to your profile. Would you like to save them before leaving this page?"
                onConfirm={runSave}
                onCancel={() => setConfirmOpen(false)}
            />

            {/* ══ LOGOUT DEVICE CONFIRM ══════════════════════ */}
            <LogoutDeviceConfirm
                session={logoutSession}
                onConfirm={confirmLogout}
                onCancel={() => setLogoutSession(null)}
            />

            {/* Toast */}
            {toast && <ToastBar toast={toast} />}
        </div>
    );
}
