import { apiGet, apiPut, apiPost } from "@/services/api";
import { ApiError } from "@/lib/fetcher";
import { getToken } from "@/lib/auth";

// ---- Types ----

export interface SettingsProfile {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    role: string;
    position?: string;
    bio?: string;
    department?: string;
    employee_id_display?: string;
    emergency_contact_name?: string;
    emergency_contact_no?: string;
    city?: string;
    pincode?: string;
    tax_address?: string;
    updated_at?: string;
}

export interface ProfileUpdatePayload {
    full_name?: string;
    phone?: string;
    bio?: string;
    employee_id_display?: string;
    emergency_contact_name?: string;
    emergency_contact_no?: string;
    city?: string;
    pincode?: string;
    tax_address?: string;
}

export interface DeviceSession {
    session_id: string;
    device_name: string;
    location: string;
    last_active: string;
    is_current: boolean;
}

export interface SecuritySettings {
    mfa_enabled: boolean;
    mfa_configured: boolean;
    active_sessions: DeviceSession[];
}

export interface PasswordChangePayload {
    current_password: string;
    new_password: string;
    confirm_password: string;
}

export interface NotificationPrefs {
    daily_submission_reminder: boolean;
    weekly_submission_reminder: boolean;
    timesheet_approved: boolean;
    timesheet_rejected: boolean;
    manager_comment_alerts: boolean;
    weekly_summary_email: boolean;
    security_alerts: boolean;
}

export interface PrivacySettings {
    show_online_status: boolean;
    display_last_active_time: boolean;
}

// ---- API Calls ----

export const getSettingsProfile = () =>
    apiGet<SettingsProfile>("/api/settings/profile");

export const updateSettingsProfile = (data: ProfileUpdatePayload) =>
    apiPut<SettingsProfile>("/api/settings/profile", data);

export const getSecuritySettings = () =>
    apiGet<SecuritySettings>("/api/settings/security");

export const uploadSettingsAvatar = async (file: File): Promise<SettingsProfile> => {
    const formData = new FormData();
    formData.append("file", file);
    
    try {
        const token = getToken() || "";
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/settings/profile/avatar`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || "Failed to upload avatar");
        }
        
        return await response.json();
    } catch (err) {
        if (err instanceof Error) {
            throw err;
        }
        throw new Error("Failed to upload avatar");
    }
};

export const changePassword = async (data: PasswordChangePayload): Promise<{ message: string }> => {
    try {
        return await apiPut<{ message: string }>("/api/settings/security/password", data);
    } catch (err) {
        if (err instanceof ApiError) {
            throw new Error(err.message);
        }
        throw err;
    }
};

export const logoutDevice = (session_id: string) =>
    apiPost<{ message: string }>("/api/settings/security/logout-device", { session_id });

export const getNotificationPrefs = () =>
    apiGet<NotificationPrefs>("/api/settings/notifications");

export const updateNotificationPrefs = (data: Partial<NotificationPrefs>) =>
    apiPut<NotificationPrefs>("/api/settings/notifications", data);

export const getPrivacySettings = () =>
    apiGet<PrivacySettings>("/api/settings/privacy");

export const updatePrivacySettings = (data: Partial<PrivacySettings>) =>
    apiPut<PrivacySettings>("/api/settings/privacy", data);
