import { useState, useEffect } from "react";
import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export interface ProjectPermissions {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canApprove: boolean;
    loading: boolean;
}

/**
 * Hook that checks the current user's permissions for a specific project.
 * Uses the RBAC permission system — calls GET /api/permissions/check.
 */
export function useProjectPermission(projectId?: string | null): ProjectPermissions {
    const [perms, setPerms] = useState<ProjectPermissions>({
        canRead: true, canWrite: true, canDelete: true, canApprove: false, loading: true,
    });

    useEffect(() => {
        if (!projectId) {
            setPerms({ canRead: true, canWrite: true, canDelete: true, canApprove: false, loading: false });
            return;
        }
        const check = async () => {
            try {
                const token = getToken();
                const headers = { Authorization: `Bearer ${token}` };
                const actions = ["read", "create", "update", "delete", "approve"];
                const results: Record<string, boolean> = {};
                await Promise.all(
                    actions.map(async (action) => {
                        try {
                            const res = await fetch(
                                `${API}/api/permissions/check?resource_type=project&resource_id=${projectId}&action=${action}`,
                                { headers }
                            );
                            if (res.ok) {
                                const data = await res.json();
                                results[action] = data.allowed ?? data.has_permission ?? true;
                            } else {
                                // If endpoint errors, default to allowed (graceful degradation)
                                results[action] = true;
                            }
                        } catch {
                            results[action] = true;
                        }
                    })
                );
                setPerms({
                    canRead: results.read ?? true,
                    canWrite: (results.create ?? true) && (results.update ?? true),
                    canDelete: results.delete ?? true,
                    canApprove: results.approve ?? false,
                    loading: false,
                });
            } catch {
                // Graceful degradation — allow everything if permission check fails
                setPerms({ canRead: true, canWrite: true, canDelete: true, canApprove: false, loading: false });
            }
        };
        check();
    }, [projectId]);

    return perms;
}
