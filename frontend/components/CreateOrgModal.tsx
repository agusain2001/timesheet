"use client";

import { useState } from "react";
import { Building2, X, AlertCircle } from "lucide-react";
import { apiPost } from "@/services/api";

interface CreateOrgModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function CreateOrgModal({ isOpen, onClose, onCreated }: CreateOrgModalProps) {
    const [name, setName] = useState("");
    const [industry, setIndustry] = useState("");
    const [country, setCountry] = useState("");
    const [email, setEmail] = useState("");
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (!name.trim()) {
            setError("Organisation name is required");
            return;
        }

        setLoading(true);
        try {
            await apiPost("/api/organizations", {
                name: name.trim(),
                industry: industry.trim() || undefined,
                country: country.trim() || undefined,
                email: email.trim() || undefined,
            });
            onCreated();
            onClose();
            // Reset
            setName("");
            setIndustry("");
            setCountry("");
            setEmail("");
        } catch (err: any) {
            setError(err.message || "Failed to create organisation");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-background border border-foreground/10 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-foreground/5 bg-foreground/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Building2 size={16} />
                        </div>
                        <h2 className="text-lg font-semibold text-foreground">Add Organisation</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-foreground/40 hover:text-foreground/80 hover:bg-foreground/5 p-1.5 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-500 text-sm border border-red-500/20">
                            <AlertCircle size={16} className="shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                            Organisation Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Acme Corp"
                            className="w-full px-3 py-2 text-sm bg-background border border-foreground/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                                Industry
                            </label>
                            <input
                                type="text"
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                placeholder="e.g. Technology"
                                className="w-full px-3 py-2 text-sm bg-background border border-foreground/10 rounded-xl focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                                Country
                            </label>
                            <input
                                type="text"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="e.g. India"
                                className="w-full px-3 py-2 text-sm bg-background border border-foreground/10 rounded-xl focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                            Contact Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="hello@acmecorp.com"
                            className="w-full px-3 py-2 text-sm bg-background border border-foreground/10 rounded-xl focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Footer */}
                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-foreground/5 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-blue-500/20"
                        >
                            {loading ? "Creating..." : "Create Organisation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
