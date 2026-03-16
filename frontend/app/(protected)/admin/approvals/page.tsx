"use client";

import { useEffect, useState } from "react";
import { Check, X, UserCheck, UserX, Users, Clock, Shield, RefreshCw, ChevronDown } from "lucide-react";

import { apiFetch } from "@/services/api";

type UserStatus = "pending" | "approved" | "rejected" | "suspended";

interface PendingUser {
    id: string;
    full_name: string;
    email: string;
    role: string;
    user_status: UserStatus;
    email_verified: boolean;
    organization_id: string | null;
    created_at: string;
}

const STATUS_COLORS: Record<UserStatus, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    suspended: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export default function ApprovalsPage() {
    const [users, setUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState<UserStatus>("pending");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError("");
        try {
            const data: any = await apiFetch(`/users/pending?status_filter=${statusFilter}`);
            setUsers(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e.message || "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, [statusFilter]);

    const handleAction = async (userId: string, action: "approve" | "reject" | "suspend" | "reactivate", userName: string) => {
        setActionLoading(userId);
        try {
            await apiFetch(`/users/${userId}/${action}`, { method: "PUT" });
            showToast(`${userName} has been ${action === "reactivate" ? "reactivated" : action + "d"}`);
            fetchUsers();
        } catch (e: any) {
            showToast(e.message || "Action failed", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const filterCounts: Partial<Record<UserStatus, string>> = {
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
        suspended: "Suspended",
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-6 lg:p-8">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 transition-all ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                    {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Shield size={20} className="text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">User Approvals</h1>
                </div>
                <p className="text-foreground/50 text-sm">Manage registration requests and user access for your organization</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 p-1 bg-foreground/5 rounded-xl border border-foreground/10 w-fit mb-6">
                {(Object.entries(filterCounts) as [UserStatus, string][]).map(([status, label]) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter === status ? "bg-background text-foreground shadow-sm border border-foreground/10" : "text-foreground/50 hover:text-foreground"}`}
                    >
                        {label}
                    </button>
                ))}
                <button onClick={fetchUsers} className="ml-2 px-3 py-2 text-sm text-foreground/40 hover:text-foreground transition-colors rounded-lg">
                    <RefreshCw size={14} />
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-foreground/30">
                        <RefreshCw size={20} className="animate-spin mr-2" />
                        Loading users...
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-foreground/30">
                        <Users size={36} className="mb-3 opacity-30" />
                        <p className="font-medium">No {statusFilter} users</p>
                        <p className="text-xs mt-1">All users with &quot;{statusFilter}&quot; status will appear here</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-foreground/5">
                                <th className="text-left py-4 px-6 text-xs font-semibold text-foreground/40 uppercase tracking-wider">User</th>
                                <th className="text-left py-4 px-4 text-xs font-semibold text-foreground/40 uppercase tracking-wider">Email</th>
                                <th className="text-left py-4 px-4 text-xs font-semibold text-foreground/40 uppercase tracking-wider">Status</th>
                                <th className="text-left py-4 px-4 text-xs font-semibold text-foreground/40 uppercase tracking-wider">Registered</th>
                                <th className="text-right py-4 px-6 text-xs font-semibold text-foreground/40 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/5">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-foreground/[0.02] transition-colors group">
                                    {/* Name */}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                {user.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{user.full_name}</p>
                                                <p className="text-xs text-foreground/40">{user.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Email */}
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm text-foreground/70">{user.email}</span>
                                            {user.email_verified && (
                                                <span title="Email verified" className="w-4 h-4 rounded-full bg-emerald-500/20 inline-flex items-center justify-center">
                                                    <Check size={10} className="text-emerald-400" />
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    {/* Status badge */}
                                    <td className="py-4 px-4">
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[user.user_status]}`}>
                                            <Clock size={10} />
                                            {user.user_status.charAt(0).toUpperCase() + user.user_status.slice(1)}
                                        </span>
                                    </td>
                                    {/* Date */}
                                    <td className="py-4 px-4 text-xs text-foreground/40">
                                        {new Date(user.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                                    </td>
                                    {/* Actions */}
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Loading spinner */}
                                            {actionLoading === user.id ? (
                                                <span className="text-xs text-foreground/30 flex items-center gap-1">
                                                    <RefreshCw size={12} className="animate-spin" /> Processing...
                                                </span>
                                            ) : (
                                                <>
                                                    {user.user_status === "pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleAction(user.id, "approve", user.full_name)}
                                                                title="Approve"
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-all"
                                                            >
                                                                <UserCheck size={13} /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(user.id, "reject", user.full_name)}
                                                                title="Reject"
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-all"
                                                            >
                                                                <UserX size={13} /> Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {user.user_status === "approved" && (
                                                        <button
                                                            onClick={() => handleAction(user.id, "suspend", user.full_name)}
                                                            title="Suspend"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg transition-all"
                                                        >
                                                            <X size={13} /> Suspend
                                                        </button>
                                                    )}
                                                    {(user.user_status === "rejected" || user.user_status === "suspended") && (
                                                        <button
                                                            onClick={() => handleAction(user.id, "reactivate", user.full_name)}
                                                            title="Reactivate"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg transition-all"
                                                        >
                                                            <UserCheck size={13} /> Reactivate
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer count */}
            {!loading && users.length > 0 && (
                <p className="mt-3 text-xs text-foreground/30 text-right">
                    {users.length} {statusFilter} user{users.length !== 1 ? "s" : ""}
                </p>
            )}
        </div>
    );
}
