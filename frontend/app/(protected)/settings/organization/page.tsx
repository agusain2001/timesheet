"use client";

import { useEffect, useState, useRef } from "react";
import {
    Building2, Globe, Phone, Mail, MapPin, FileText,
    Save, Upload, CheckCircle, AlertCircle, RefreshCw, Pencil
} from "lucide-react";

import { apiFetch } from "@/services/api";

interface OrgData {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    tax_id: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zip_code: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    industry: string | null;
    subscription_plan: string;
    max_users: number;
    max_projects: number;
    is_verified: boolean;
    is_active: boolean;
    user_count: number;
    project_count: number;
}

const INDUSTRIES = [
    "Technology", "Finance", "Healthcare", "Education", "Retail",
    "Manufacturing", "Consulting", "Media", "Construction", "Other"
];

const PLAN_BADGES: Record<string, string> = {
    free: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    starter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    professional: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    enterprise: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
            <div className="flex items-center gap-2 mb-1 text-foreground/40">
                {icon}
                <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
    );
}

function Field({ label, value, onSave, type = "text", hint }: {
    label: string;
    value: string;
    onSave: (v: string) => void;
    type?: string;
    hint?: string;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setDraft(value); }, [value]);
    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const commit = () => {
        setEditing(false);
        if (draft !== value) onSave(draft);
    };

    return (
        <div className="group flex items-center justify-between py-3 border-b border-foreground/5 last:border-0">
            <div className="flex-1">
                <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-0.5">{label}</p>
                {editing ? (
                    <input
                        ref={inputRef}
                        type={type}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
                        className="text-sm text-foreground bg-transparent border-b border-blue-500 outline-none w-full pb-0.5"
                    />
                ) : (
                    <p className="text-sm text-foreground/80">{value || <span className="text-foreground/30 italic">Not set</span>}</p>
                )}
                {hint && <p className="text-xs text-foreground/30 mt-0.5">{hint}</p>}
            </div>
            <button
                onClick={() => setEditing(true)}
                className="ml-3 p-1.5 rounded-lg text-foreground/20 hover:text-blue-400 hover:bg-blue-500/10 transition-all opacity-0 group-hover:opacity-100"
            >
                <Pencil size={13} />
            </button>
        </div>
    );
}

export default function OrganizationSettingsPage() {
    const [org, setOrg] = useState<OrgData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchOrg = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await apiFetch("/organizations/my");
            setOrg(data);
        } catch (e: any) {
            setError(e.message || "Failed to load organization");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrg(); }, []);

    const saveField = async (field: string, value: string) => {
        if (!org) return;
        setSaving(true);
        try {
            const updated = await apiFetch(`/organizations/${org.id}`, {
                method: "PUT",
                body: JSON.stringify({ [field]: value || null }),
            });
            setOrg(updated);
            showToast("Saved successfully");
        } catch (e: any) {
            showToast(e.message || "Failed to save", false);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <RefreshCw size={20} className="animate-spin text-foreground/30" />
            </div>
        );
    }

    if (error || !org) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-3">
                <AlertCircle size={36} className="text-red-400" />
                <p className="text-foreground/50">{error || "No organization found"}</p>
                <button onClick={fetchOrg} className="text-xs text-blue-400 hover:underline">Retry</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-6 lg:p-8 max-w-4xl mx-auto">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 ${toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                    {toast.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <Building2 size={20} className="text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold">{org.name}</h1>
                        {org.is_verified && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle size={10} /> Verified
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-foreground/40">/{org.slug} &nbsp;·&nbsp; 
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ml-1 ${PLAN_BADGES[org.subscription_plan] || PLAN_BADGES.free}`}>
                            {org.subscription_plan}
                        </span>
                    </p>
                </div>
                {saving && <RefreshCw size={16} className="animate-spin text-foreground/30 mt-2" />}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <StatCard label="Members" value={org.user_count} icon={<div className="w-3 h-3 rounded-full bg-blue-500" />} />
                <StatCard label="Projects" value={org.project_count} icon={<div className="w-3 h-3 rounded-full bg-purple-500" />} />
                <StatCard label="Max Users" value={org.max_users} icon={<div className="w-3 h-3 rounded-full bg-amber-500" />} />
                <StatCard label="Max Projects" value={org.max_projects} icon={<div className="w-3 h-3 rounded-full bg-emerald-500" />} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
                    <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText size={14} /> Basic Information
                    </h2>
                    <Field label="Organization Name" value={org.name} onSave={v => saveField("name", v)} />
                    <Field label="Tax ID / Registration No." value={org.tax_id || ""} onSave={v => saveField("tax_id", v)} />
                    <Field label="Industry" value={org.industry || ""} onSave={v => saveField("industry", v)} hint="e.g. Technology, Finance, Healthcare" />
                    <Field label="Website" value={org.website || ""} onSave={v => saveField("website", v)} type="url" />
                </div>

                {/* Contact */}
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
                    <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Phone size={14} /> Contact Details
                    </h2>
                    <Field label="Email" value={org.email || ""} onSave={v => saveField("email", v)} type="email" />
                    <Field label="Phone" value={org.phone || ""} onSave={v => saveField("phone", v)} type="tel" />
                </div>

                {/* Address */}
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 md:col-span-2">
                    <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MapPin size={14} /> Address
                    </h2>
                    <div className="grid md:grid-cols-2 gap-0 md:gap-x-6">
                        <Field label="Street Address" value={org.address || ""} onSave={v => saveField("address", v)} />
                        <Field label="City" value={org.city || ""} onSave={v => saveField("city", v)} />
                        <Field label="State / Province" value={org.state || ""} onSave={v => saveField("state", v)} />
                        <Field label="Country" value={org.country || ""} onSave={v => saveField("country", v)} />
                        <Field label="ZIP / Post Code" value={org.zip_code || ""} onSave={v => saveField("zip_code", v)} />
                    </div>
                </div>
            </div>

            {/* Slug (read-only info) */}
            <div className="mt-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-5 py-4">
                <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-1">Organization Slug (URL)</p>
                <p className="text-sm text-foreground/60 font-mono">{org.slug}</p>
                <p className="text-xs text-foreground/30 mt-0.5">Used in links and API URLs. Contact support to change this.</p>
            </div>
        </div>
    );
}
