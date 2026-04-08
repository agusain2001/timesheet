"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { getMyPermissions, getMyRoles, type MyPermissions, type Role } from "@/services/permissions";

// ─── Context ──────────────────────────────────────────────────────────────────

interface PermissionContextValue {
    permissions: string[];
    roles: Role[];
    loading: boolean;
    hasPermission: (perm: string) => boolean;
    hasRole: (roleName: string) => boolean;
    refresh: () => void;
}

const PermissionContext = createContext<PermissionContextValue>({
    permissions: [], roles: [], loading: true,
    hasPermission: () => false,
    hasRole: () => false,
    refresh: () => { },
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PermissionProvider({ children }: { children: React.ReactNode }) {
    const [permissions, setPermissions] = useState<string[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [permsData, rolesData] = await Promise.all([getMyPermissions(), getMyRoles()]);
            setPermissions(permsData.permissions ?? []);
            setRoles(Array.isArray(rolesData) ? rolesData : []);
        } catch {
            setPermissions([]); setRoles([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const hasPermission = useCallback((perm: string) =>
        permissions.includes(perm) || permissions.includes("*"), [permissions]);

    const hasRole = useCallback((roleName: string) =>
        roles.some((r) => r.name === roleName || r.display_name === roleName), [roles]);

    return (
        <PermissionContext.Provider value={{ permissions, roles, loading, hasPermission, hasRole, refresh: load }}>
            {children}
        </PermissionContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissions() {
    return useContext(PermissionContext);
}

// ─── Can Component ────────────────────────────────────────────────────────────

interface CanProps {
    /** Permission string to check, e.g. "task.create" */
    permission?: string;
    /** Role name to check, e.g. "admin" */
    role?: string;
    /** Rendered when condition is NOT met (optional) */
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Conditionally renders children based on the current user's permissions/roles.
 *
 * @example
 * <Can permission="task.delete" fallback={<span>No access</span>}>
 *   <DeleteButton />
 * </Can>
 *
 * <Can role="admin">
 *   <AdminPanel />
 * </Can>
 */
export function Can({ permission, role, fallback = null, children }: CanProps) {
    const { hasPermission, hasRole, loading } = usePermissions();

    if (loading) return null;

    const allowed = (
        (!permission || hasPermission(permission)) &&
        (!role || hasRole(role))
    );

    return allowed ? <>{children}</> : <>{fallback}</>;
}

// ─── withPermission HOC ───────────────────────────────────────────────────────

export function withPermission<T extends {}>(
    WrappedComponent: React.ComponentType<T>,
    requiredPermission: string
) {
    return function PermissionWrapped(props: T) {
        const { hasPermission, loading } = usePermissions();

        if (loading) return null;
        if (!hasPermission(requiredPermission)) return null;

        return <WrappedComponent {...props} />;
    };
}
