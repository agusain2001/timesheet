"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/services/users";

// =============== Icons ===============

const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const BellIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const LockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const PaletteIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
);

const IntegrationIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
);

const TeamIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const BillingIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
);

// =============== Components ===============

interface TabButtonProps {
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}

function TabButton({ label, icon, isActive, onClick }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors text-left ${isActive
                ? "bg-blue-600 text-white"
                : "text-foreground/60 hover:text-foreground hover:bg-foreground/10"
                }`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </button>
    );
}

interface ToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label: string;
    description?: string;
}

function Toggle({ enabled, onChange, label, description }: ToggleProps) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-foreground/10 last:border-0">
            <div>
                <p className="font-medium text-foreground">{label}</p>
                {description && <p className="text-sm text-foreground/50 mt-0.5">{description}</p>}
            </div>
            <button
                onClick={() => onChange(!enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-blue-600" : "bg-foreground/20"
                    }`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? "translate-x-5" : ""
                        }`}
                />
            </button>
        </div>
    );
}

function ProfileSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        full_name: "",
        email: "",
        phone: "",
        timezone: "America/New_York",
        language: "en",
        avatar: "",
    });

    // Fetch current user data on mount
    useEffect(() => {
        async function fetchUser() {
            try {
                const user = await getCurrentUser();
                if (user) {
                    setProfile({
                        full_name: user.full_name || "",
                        email: user.email || "",
                        phone: "", // Add phone field if available in User type
                        timezone: "America/New_York",
                        language: "en",
                        avatar: user.avatar_url || "",
                    });
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchUser();
    }, []);

    // Get user initials
    const getInitials = (name: string) => {
        if (!name) return '...';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Save profile changes
    const handleSave = async () => {
        try {
            setSaving(true);
            await updateUser('me', {
                full_name: profile.full_name,
            });
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Profile Settings</h2>
                <p className="text-foreground/60">Manage your personal information</p>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {getInitials(profile.full_name)}
                </div>
                <div>
                    <button className="px-4 py-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg text-sm font-medium transition-colors">
                        Change Avatar
                    </button>
                    <p className="text-xs text-foreground/50 mt-1">JPG, PNG or GIF. Max 2MB</p>
                </div>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">Full Name</label>
                    <input
                        type="text"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">Email</label>
                    <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">Phone</label>
                    <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">Timezone</label>
                    <select
                        value={profile.timezone}
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="Africa/Cairo">Egypt (EET)</option>
                    </select>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save Changes
            </button>
        </div>
    );
}

function NotificationSettings() {
    const [notifications, setNotifications] = useState({
        email_tasks: true,
        email_projects: true,
        email_mentions: true,
        email_weekly: false,
        push_tasks: true,
        push_mentions: true,
        push_deadlines: true,
        slack_enabled: false,
    });

    const updateNotification = (key: string, value: boolean) => {
        setNotifications({ ...notifications, [key]: value });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Notification Settings</h2>
                <p className="text-foreground/60">Choose how you want to be notified</p>
            </div>

            <div className="space-y-6">
                <div className="p-4 rounded-xl border border-foreground/10 bg-background">
                    <h3 className="font-semibold text-foreground mb-4">Email Notifications</h3>
                    <Toggle
                        enabled={notifications.email_tasks}
                        onChange={(v) => updateNotification("email_tasks", v)}
                        label="Task Updates"
                        description="Get notified when tasks are assigned, completed, or updated"
                    />
                    <Toggle
                        enabled={notifications.email_projects}
                        onChange={(v) => updateNotification("email_projects", v)}
                        label="Project Updates"
                        description="Updates about projects you're a member of"
                    />
                    <Toggle
                        enabled={notifications.email_mentions}
                        onChange={(v) => updateNotification("email_mentions", v)}
                        label="Mentions"
                        description="When someone mentions you in a comment"
                    />
                    <Toggle
                        enabled={notifications.email_weekly}
                        onChange={(v) => updateNotification("email_weekly", v)}
                        label="Weekly Digest"
                        description="Weekly summary of your activity and upcoming tasks"
                    />
                </div>

                <div className="p-4 rounded-xl border border-foreground/10 bg-background">
                    <h3 className="font-semibold text-foreground mb-4">Push Notifications</h3>
                    <Toggle
                        enabled={notifications.push_tasks}
                        onChange={(v) => updateNotification("push_tasks", v)}
                        label="Task Assignments"
                        description="When a new task is assigned to you"
                    />
                    <Toggle
                        enabled={notifications.push_mentions}
                        onChange={(v) => updateNotification("push_mentions", v)}
                        label="Mentions"
                        description="Real-time alerts when mentioned"
                    />
                    <Toggle
                        enabled={notifications.push_deadlines}
                        onChange={(v) => updateNotification("push_deadlines", v)}
                        label="Deadlines"
                        description="Reminders for upcoming task deadlines"
                    />
                </div>
            </div>

            <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Save Preferences
            </button>
        </div>
    );
}

function SecuritySettings() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Security Settings</h2>
                <p className="text-foreground/60">Manage your account security</p>
            </div>

            <div className="p-4 rounded-xl border border-foreground/10 bg-background space-y-4">
                <h3 className="font-semibold text-foreground">Change Password</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-2">Current Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-2">New Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-2">Confirm New Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Update Password
                </button>
            </div>

            <div className="p-4 rounded-xl border border-foreground/10 bg-background">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-foreground">Two-Factor Authentication</h3>
                        <p className="text-sm text-foreground/50">Add an extra layer of security</p>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400">
                        Not Enabled
                    </span>
                </div>
                <button className="px-4 py-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg text-sm font-medium transition-colors">
                    Enable 2FA
                </button>
            </div>

            <div className="p-4 rounded-xl border border-foreground/10 bg-background">
                <h3 className="font-semibold text-foreground mb-4">Active Sessions</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                💻
                            </div>
                            <div>
                                <p className="font-medium text-foreground text-sm">Windows • Chrome</p>
                                <p className="text-xs text-foreground/50">New York, US • Current session</p>
                            </div>
                        </div>
                        <span className="text-xs text-emerald-400">Active now</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center">
                                📱
                            </div>
                            <div>
                                <p className="font-medium text-foreground text-sm">iPhone • Safari</p>
                                <p className="text-xs text-foreground/50">New York, US • 2 hours ago</p>
                            </div>
                        </div>
                        <button className="text-xs text-red-400 hover:text-red-300 transition-colors">
                            Revoke
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AppearanceSettings() {
    const [theme, setTheme] = useState("dark");
    const [accentColor, setAccentColor] = useState("blue");

    const colors = [
        { name: "blue", class: "bg-blue-500" },
        { name: "purple", class: "bg-purple-500" },
        { name: "emerald", class: "bg-emerald-500" },
        { name: "rose", class: "bg-rose-500" },
        { name: "amber", class: "bg-amber-500" },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Appearance</h2>
                <p className="text-foreground/60">Customize how ProjectHub looks</p>
            </div>

            <div className="p-4 rounded-xl border border-foreground/10 bg-background">
                <h3 className="font-semibold text-foreground mb-4">Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                    {["light", "dark", "system"].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTheme(t)}
                            className={`p-4 rounded-xl border transition-all ${theme === t
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-foreground/10 hover:border-foreground/20"
                                }`}
                        >
                            <div className={`w-full h-12 rounded-lg mb-2 ${t === "light" ? "bg-white" : t === "dark" ? "bg-gray-800" : "bg-gradient-to-r from-white to-gray-800"
                                }`} />
                            <p className="text-sm font-medium text-foreground capitalize">{t}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 rounded-xl border border-foreground/10 bg-background">
                <h3 className="font-semibold text-foreground mb-4">Accent Color</h3>
                <div className="flex gap-3">
                    {colors.map((color) => (
                        <button
                            key={color.name}
                            onClick={() => setAccentColor(color.name)}
                            className={`w-10 h-10 rounded-full ${color.class} transition-all ${accentColor === color.name ? "ring-2 ring-offset-2 ring-offset-background ring-white" : ""
                                }`}
                        />
                    ))}
                </div>
            </div>

            <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Save Appearance
            </button>
        </div>
    );
}

// =============== Main Component ===============

type SettingsTab = "profile" | "notifications" | "security" | "appearance" | "integrations" | "team" | "billing";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

    const tabs = [
        { id: "profile" as SettingsTab, label: "Profile", icon: <UserIcon /> },
        { id: "notifications" as SettingsTab, label: "Notifications", icon: <BellIcon /> },
        { id: "security" as SettingsTab, label: "Security", icon: <LockIcon /> },
        { id: "appearance" as SettingsTab, label: "Appearance", icon: <PaletteIcon /> },
        { id: "integrations" as SettingsTab, label: "Integrations", icon: <IntegrationIcon /> },
        { id: "team" as SettingsTab, label: "Team", icon: <TeamIcon /> },
        { id: "billing" as SettingsTab, label: "Billing", icon: <BillingIcon /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case "profile":
                return <ProfileSettings />;
            case "notifications":
                return <NotificationSettings />;
            case "security":
                return <SecuritySettings />;
            case "appearance":
                return <AppearanceSettings />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-64 text-foreground/50">
                        <p>This section is coming soon</p>
                    </div>
                );
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar */}
                    <div className="md:w-64 shrink-0">
                        <nav className="space-y-1">
                            {tabs.map((tab) => (
                                <TabButton
                                    key={tab.id}
                                    label={tab.label}
                                    icon={tab.icon}
                                    isActive={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                />
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1 rounded-xl border border-foreground/10 bg-background p-6">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
