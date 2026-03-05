"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/services/users";
import { getUserPageAccess, updateUserPageAccess, updateUserRole } from "@/services/page-access";
import { getCurrentUser } from "@/services/users";
import type { User } from "@/types/api";
import { toast } from "sonner";
import {
    Shield, Users, ChevronLeft, Save, LayoutDashboard,
    GitBranch, BarChart2, FileText, Zap, BotMessageSquare,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageToggle {
    key: string;
    label: string;
    description: string;
    icon: React.ElementType;
    granted: boolean;
}

const PAGE_DEFINITIONS = [
    {
        key: "operations",
        label: "Operation",
        description: "Departments, Clients, Projects, Employees, Workspaces, Teams",
        icon: GitBranch,
    },
    {
        key: "dashboards",
        label: "Dashboards",
        description: "Manager View, Executive View, Capacity Planning",
        icon: LayoutDashboard,
    },
    {
        key: "reports",
        label: "Reports",
        description: "Analytics, Scheduled Reports",
        icon: BarChart2,
    },
    {
        key: "templates",
        label: "Templates",
        description: "Task and project templates",
        icon: FileText,
    },
    {
        key: "automation",
        label: "Automation",
        description: "Automation rules & triggers",
        icon: Zap,
    },
    {
        key: "ai",
        label: "AI Features",
        description: "AI-powered assistant & features",
        icon: BotMessageSquare,
    },
];

const ROLE_OPTIONS = [
    { value: "employee", label: "Employee", description: "Read-only access to basic data" },
    { value: "manager", label: "Manager", description: "Can create/edit most resources" },
    { value: "admin", label: "Admin", description: "Full access to all resources" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserPermissionsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [targetUser, setTargetUser] = useState<User | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [role, setRole] = useState<string>("employee");
    const [pageToggles, setPageToggles] = useState<PageToggle[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Guard: only admin can access this page
    useEffect(() => {
        getCurrentUser().then((u) => {
            setCurrentUser(u);
            if (u.role !== "admin") {
                toast.error("Admin access required");
                router.back();
            }
        });
    }, [router]);

    // Load target user + their current page access
    useEffect(() => {
        if (!id) return;
        Promise.all([getUser(id), getUserPageAccess(id)])
            .then(([user, access]) => {
                setTargetUser(user);
                setRole(user.role);

                const statusMap = access.restricted_pages_status ?? {};
                const toggles = PAGE_DEFINITIONS.map((def) => ({
                    ...def,
                    granted: statusMap[def.key] ?? false,
                }));
                setPageToggles(toggles);
            })
            .catch(() => toast.error("Failed to load user data"))
            .finally(() => setLoading(false));
    }, [id]);

    const handleToggle = (key: string) => {
        setPageToggles((prev) =>
            prev.map((t) => (t.key === key ? { ...t, granted: !t.granted } : t))
        );
    };

    const handleSave = async () => {
        if (!targetUser) return;
        setSaving(true);
        try {
            // Save role if changed
            if (role !== targetUser.role) {
                await updateUserRole(targetUser.id, role);
            }
            // Save page access
            const pagesMap: Record<string, boolean> = {};
            pageToggles.forEach((t) => {
                pagesMap[t.key] = t.granted;
            });
            await updateUserPageAccess(targetUser.id, pagesMap);

            toast.success("Permissions updated successfully!");
            // Refresh local state
            setTargetUser((prev) => prev ? { ...prev, role } : prev);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update permissions";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="flex gap-2 items-center">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Loading permissions...
                </div>
            </div>
        );
    }

    if (!targetUser || currentUser?.role !== "admin") return null;

    const isEmployeeRole = role === "employee";

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-lg hover:bg-foreground/10 transition"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="text-blue-500" size={24} />
                        Manage Permissions
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Configure access for{" "}
                        <span className="font-medium text-foreground">{targetUser.full_name}</span>
                        {" "}· {targetUser.email}
                    </p>
                </div>
            </div>

            {/* Role Section */}
            <section className="border border-foreground/10 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Users size={18} className="text-blue-400" />
                    <h2 className="font-semibold text-lg">User Role</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {ROLE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setRole(opt.value)}
                            className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${role === opt.value
                                    ? "border-blue-500 bg-blue-500/10"
                                    : "border-foreground/10 hover:border-foreground/30"
                                }`}
                        >
                            <div className="font-semibold text-sm">{opt.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{opt.description}</div>
                        </button>
                    ))}
                </div>
                {!isEmployeeRole && (
                    <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                        ⚡ <strong>{role === "manager" ? "Managers" : "Admins"}</strong> automatically have
                        access to all pages. Per-page toggles below only apply to employees.
                    </div>
                )}
            </section>

            {/* Page Access Section */}
            <section className="border border-foreground/10 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <LayoutDashboard size={18} className="text-blue-400" />
                        <h2 className="font-semibold text-lg">Page Access</h2>
                    </div>
                    {isEmployeeRole && (
                        <span className="text-xs text-muted-foreground">
                            Toggle which restricted pages this employee can see
                        </span>
                    )}
                </div>

                <div className="space-y-3">
                    {pageToggles.map((toggle) => {
                        const Icon = toggle.icon;
                        return (
                            <div
                                key={toggle.key}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${!isEmployeeRole
                                        ? "border-foreground/5 opacity-50 cursor-not-allowed"
                                        : toggle.granted
                                            ? "border-green-500/40 bg-green-500/5"
                                            : "border-foreground/10 hover:border-foreground/20"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${toggle.granted || !isEmployeeRole ? "bg-blue-500/15" : "bg-foreground/5"}`}>
                                        <Icon size={18} className={toggle.granted || !isEmployeeRole ? "text-blue-400" : "text-muted-foreground"} />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{toggle.label}</div>
                                        <div className="text-xs text-muted-foreground">{toggle.description}</div>
                                    </div>
                                </div>

                                {/* Toggle switch */}
                                <button
                                    disabled={!isEmployeeRole}
                                    onClick={() => handleToggle(toggle.key)}
                                    className={`relative w-11 h-6 rounded-full transition-all duration-300 ${toggle.granted || !isEmployeeRole
                                            ? "bg-blue-500"
                                            : "bg-foreground/20"
                                        } disabled:cursor-not-allowed`}
                                    aria-label={`Toggle ${toggle.label}`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${toggle.granted || !isEmployeeRole ? "translate-x-5" : "translate-x-0"
                                            }`}
                                    />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl font-medium transition-all duration-200"
                >
                    {saving ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save size={16} />
                    )}
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
