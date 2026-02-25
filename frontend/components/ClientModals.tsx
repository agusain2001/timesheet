"use client";

import { useState } from "react";
import { createClient, updateClient } from "@/services/clients";
import type { Client, ClientCreate, ClientUpdate } from "@/types/api";

// ─── Field ───────────────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputCls = "w-full border border-foreground/15 rounded-lg px-3 py-2 bg-foreground/[0.03] text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-blue-500/50 transition";
const selectCls = inputCls + " cursor-pointer";

// ─── Client Form Fields ───────────────────────────────────────────────────────
interface FormData {
    name: string;
    alias: string;
    client_type: string;
    region: string;
    business_sector: string;
    company_size: string;
    website: string;
    contact_person_name: string;
    contact_person_role: string;
    primary_phone: string;
    secondary_phone: string;
    primary_email: string;
    preferred_currency: string;
    billing_type: string;
    tax_id: string;
    notes: string;
}

const EMPTY_FORM: FormData = {
    name: "", alias: "", client_type: "", region: "", business_sector: "",
    company_size: "", website: "", contact_person_name: "", contact_person_role: "",
    primary_phone: "", secondary_phone: "", primary_email: "",
    preferred_currency: "", billing_type: "", tax_id: "", notes: "",
};

function clientToForm(c: Client): FormData {
    let contacts: Record<string, string> = {};
    try { if (c.contacts) contacts = JSON.parse(c.contacts); } catch { /* ignore */ }
    return {
        name: c.name ?? "",
        alias: c.alias ?? "",
        client_type: contacts.client_type ?? "",
        region: c.region ?? "",
        business_sector: c.business_sector ?? "",
        company_size: contacts.company_size ?? "",
        website: contacts.website ?? "",
        contact_person_name: contacts.contact_person_name ?? "",
        contact_person_role: contacts.contact_person_role ?? "",
        primary_phone: contacts.primary_phone ?? (c.contact_numbers?.[0] ?? ""),
        secondary_phone: contacts.secondary_phone ?? (c.contact_numbers?.[1] ?? ""),
        primary_email: contacts.primary_email ?? "",
        preferred_currency: contacts.preferred_currency ?? "",
        billing_type: contacts.billing_type ?? "",
        tax_id: contacts.tax_id ?? "",
        notes: c.notes ?? "",
    };
}

function formToClientCreate(f: FormData): ClientCreate {
    const contacts = JSON.stringify({
        client_type: f.client_type,
        company_size: f.company_size,
        website: f.website,
        contact_person_name: f.contact_person_name,
        contact_person_role: f.contact_person_role,
        primary_phone: f.primary_phone,
        secondary_phone: f.secondary_phone,
        primary_email: f.primary_email,
        preferred_currency: f.preferred_currency,
        billing_type: f.billing_type,
        tax_id: f.tax_id,
    });
    return {
        name: f.name.trim(),
        alias: f.alias.trim() || undefined,
        region: f.region || undefined,
        business_sector: f.business_sector || undefined,
        contacts,
        notes: f.notes.trim() || undefined,
    };
}

function ClientFormBody({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
    const upd = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm({ ...form, [key]: e.target.value });

    const REGIONS = ["Kanpur, India", "Mumbai, India", "Delhi, India", "Bangalore, India", "Chennai, India", "Hyderabad, India", "Pune, India", "Other"];
    const SECTORS = ["Pharmacy", "Technology", "Finance", "Healthcare", "Education", "Manufacturing", "Retail", "Other"];
    const CURRENCIES = ["USD", "INR", "EUR", "GBP", "AED"];
    const BILLING = ["Fixed", "Hourly", "Monthly", "Milestone"];
    const ROLES = ["Manager", "Director", "CEO", "CTO", "CFO", "Other"];
    const SIZES = ["Small (1-10 members)", "Medium (11-50 members)", "Large (51-200 members)", "Enterprise (200+)"];
    const TYPES = ["Individual", "Company", "Government", "Non-Profit"];

    return (
        <div className="space-y-6 px-6 py-4 overflow-y-auto max-h-[65vh]">
            {/* Client Identity */}
            <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-3">Client Identity</p>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Client Name" required>
                        <input className={inputCls} value={form.name} onChange={upd("name")} placeholder="Enter Client Name" />
                    </Field>
                    <Field label="Client ID">
                        <input className={inputCls + " opacity-50 cursor-not-allowed"} value="**Auto-generated**" readOnly />
                    </Field>
                    <Field label="Client Alias">
                        <input className={inputCls} value={form.alias} onChange={upd("alias")} placeholder="Enter Client Alias Name" />
                    </Field>
                    <Field label="Client Type">
                        <select className={selectCls} value={form.client_type} onChange={upd("client_type")}>
                            <option value="">Select Client Type</option>
                            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </Field>
                </div>
            </div>

            {/* Business Details */}
            <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-3">Business Details</p>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Region">
                        <select className={selectCls} value={form.region} onChange={upd("region")}>
                            <option value="">Select Region</option>
                            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </Field>
                    <Field label="Business Sector">
                        <select className={selectCls} value={form.business_sector} onChange={upd("business_sector")}>
                            <option value="">Select Sector</option>
                            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Company Size (Optional)">
                        <select className={selectCls} value={form.company_size} onChange={upd("company_size")}>
                            <option value="">Select Company Size</option>
                            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Website (Optional)">
                        <input className={inputCls} value={form.website} onChange={upd("website")} placeholder="Enter Website URL" />
                    </Field>
                </div>
            </div>

            {/* Contact Information */}
            <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-3">Contact Information</p>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Contact Person Name">
                        <input className={inputCls} value={form.contact_person_name} onChange={upd("contact_person_name")} placeholder="Enter Name" />
                    </Field>
                    <Field label="Contact Person Role">
                        <select className={selectCls} value={form.contact_person_role} onChange={upd("contact_person_role")}>
                            <option value="">Select Contact Person Role</option>
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </Field>
                    <Field label="Primary Phone Number">
                        <input className={inputCls} value={form.primary_phone} onChange={upd("primary_phone")} placeholder="Enter Primary Phone Number" />
                    </Field>
                    <Field label="Secondary Phone Number (Optional)">
                        <input className={inputCls} value={form.secondary_phone} onChange={upd("secondary_phone")} placeholder="Enter Secondary Phone Number" />
                    </Field>
                    <div className="col-span-2">
                        <Field label="Primary Email">
                            <input className={inputCls} type="email" value={form.primary_email} onChange={upd("primary_email")} placeholder="Enter Primary Email" />
                        </Field>
                    </div>
                </div>
            </div>

            {/* Financial & Billing */}
            <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-3">Financial &amp; Billing Information</p>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Preferred Currency">
                        <select className={selectCls} value={form.preferred_currency} onChange={upd("preferred_currency")}>
                            <option value="">Select the currency preferred</option>
                            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </Field>
                    <Field label="Billing Type">
                        <select className={selectCls} value={form.billing_type} onChange={upd("billing_type")}>
                            <option value="">Select the billing type</option>
                            {BILLING.map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </Field>
                    <div className="col-span-2">
                        <Field label="Tax ID / GST / VAT Number (Optional)">
                            <input className={inputCls} value={form.tax_id} onChange={upd("tax_id")} placeholder="Enter ID Number" />
                        </Field>
                    </div>
                </div>
            </div>

            {/* Notes */}
            <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-3">Client&apos;s Project Information</p>
                <Field label="Note related to client (Optional)">
                    <textarea className={inputCls + " resize-none"} rows={3} value={form.notes} onChange={upd("notes")} placeholder="Enter information to be noted related to client" />
                </Field>
            </div>
        </div>
    );
}

// ─── Add Client Modal ─────────────────────────────────────────────────────────
export function AddClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!form.name.trim()) { setError("Client name is required."); return; }
        setSaving(true); setError(null);
        try {
            await createClient(formToClientCreate(form));
            onCreated(); onClose();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to create client");
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-[560px] rounded-2xl border border-foreground/10 bg-background shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-foreground/10">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Add Client</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">Create and manage client information, projects, and billing details</p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <ClientFormBody form={form} setForm={setForm} />
                {error && <p className="px-6 pb-2 text-xs text-red-400">{error}</p>}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Draft</button>
                    <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-1.5">
                        {saving ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Saving...</> : "Send To Manager For Approval"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Edit Client Modal ────────────────────────────────────────────────────────
export function EditClientModal({ client, onClose, onSaved }: { client: Client; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState<FormData>(clientToForm(client));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Client name is required."); return; }
        setSaving(true); setError(null);
        try {
            const data: ClientUpdate = formToClientCreate(form);
            await updateClient(client.id, data);
            onSaved(); onClose();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to update client");
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-[560px] rounded-2xl border border-foreground/10 bg-background shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-foreground/10">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Edit Client</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">Edit client information, projects, and billing details. The manager will be informed about the changes you have done.</p>
                    </div>
                    <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition p-1 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <ClientFormBody form={form} setForm={setForm} />
                {error && <p className="px-6 pb-2 text-xs text-red-400">{error}</p>}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-foreground/10">
                    <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-foreground/15 text-foreground/70 hover:bg-foreground/5 transition">Discard</button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-1.5">
                        {saving ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Saving...</> : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
