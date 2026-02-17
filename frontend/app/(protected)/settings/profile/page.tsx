"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit } from "lucide-react";
import { apiGet } from "@/services/api";

// ============ Types ============

interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    employee_id: string;
    alias?: string;
    user_type: string;
    avatar_url?: string;
    // Business Details
    region?: string;
    company_size?: string;
    business_sector?: string;
    website?: string;
    // Contact Information
    contact_person_name?: string;
    contact_person_role?: string;
    primary_phone?: string;
    secondary_phone?: string;
    // Financial & Billing
    preferred_currency?: string;
    billing_type?: string;
    // Projects
    projects?: Array<{ id: string; name: string }>;
}

// ============ Main Component ============

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiGet<UserProfile>("/api/users/profile")
            .then((data) => {
                setProfile(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load profile:", err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="space-y-6 max-w-[900px] mx-auto">
                <Skeleton className="h-10 w-32" />
                <div className="space-y-4">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center py-20">
                <p className="text-foreground/60">Failed to load profile</p>
                <button
                    onClick={() => router.push("/settings")}
                    className="mt-4 text-blue-500 hover:underline"
                >
                    Back to Settings
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[900px] mx-auto">
            {/* Go Back */}
            <button
                onClick={() => router.push("/settings")}
                className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition"
            >
                <ArrowLeft size={16} />
                Go Back
            </button>

            {/* Header Section */}
            <div className="relative rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-8">
                {/* Edit Button */}
                <button className="absolute top-6 right-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-foreground/15 text-foreground hover:bg-foreground/5 transition">
                    <Edit size={14} />
                    Edit
                </button>

                {/* Avatar & Name */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-foreground/10 flex items-center justify-center text-foreground/40 text-xl font-bold mb-4">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            "No Photo"
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">
                        {profile.full_name}
                    </h1>
                    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-500/15 text-blue-500 mb-2">
                        {profile.user_type === "individual" ? "Individual" : profile.user_type}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-foreground/60">
                        {profile.alias && (
                            <>
                                <span>Alias: {profile.alias}</span>
                                <span className="text-foreground/30">|</span>
                            </>
                        )}
                        <span>ID: {profile.employee_id}</span>
                    </div>
                </div>
            </div>

            {/* Business Details */}
            <Section title="Business Details">
                <InfoRow label="Region" value={profile.region || "—"} />
                <InfoRow label="Company Size" value={profile.company_size || "—"} />
                <InfoRow label="Business Sector" value={profile.business_sector || "—"} />
                <InfoRow label="Website">
                    {profile.website ? (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">
                            {profile.website}
                        </a>
                    ) : (
                        <span className="text-sm text-foreground/60">—</span>
                    )}
                </InfoRow>
            </Section>

            {/* Contact Information */}
            <Section title="Contact Information">
                <InfoRow label="Contact Person Name" value={profile.contact_person_name || "—"} />
                <InfoRow label="Contact Person Role" value={profile.contact_person_role || "—"} />
                <InfoRow label="Primary Phone Number" value={profile.primary_phone || "—"} />
                <InfoRow label="Secondary Phone Number" value={profile.secondary_phone || "—"} />
            </Section>

            {/* Financial & Billing Information */}
            <Section title="Financial & Billing Information">
                <InfoRow label="Preferred Currency" value={profile.preferred_currency || "—"} />
                <InfoRow label="Billing Type" value={profile.billing_type || "—"} />
            </Section>

            {/* Related Projects */}
            <Section title="Related Projects">
                {profile.projects && profile.projects.length > 0 ? (
                    profile.projects.map((project) => (
                        <div
                            key={project.id}
                            className="flex items-center justify-between py-3 border-b border-foreground/5 last:border-b-0"
                        >
                            <span className="text-sm text-foreground/80">{project.name}</span>
                            <button className="text-xs text-blue-500 hover:underline">
                                View Project Details →
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-sm text-foreground/50 text-center py-3">
                        No related projects
                    </div>
                )}
            </Section>
        </div>
    );
}

// ============ Sub-components ============

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">{title}</h2>
            <div className="space-y-0">{children}</div>
        </div>
    );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-foreground/5 last:border-b-0">
            <span className="text-sm font-medium text-foreground/70">{label}</span>
            {children || <span className="text-sm text-foreground/60">{value}</span>}
        </div>
    );
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-foreground/10 rounded ${className || ""}`} />;
}
