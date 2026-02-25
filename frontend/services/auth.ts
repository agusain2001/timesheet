/**
 * Centralized auth service — typed wrappers around lib/auth.ts
 * Use these in UI components instead of calling lib/auth directly.
 */

export {
    login,
    register,
    logout,
    loginWithGoogle,
    loginWithMicrosoft,
    handleOAuthCallback,
    getToken,
    setToken,
    clearToken,
    isAuthenticated,
    getCurrentUser,
    validateToken,
} from "@/lib/auth";

export type { User } from "@/lib/auth";
