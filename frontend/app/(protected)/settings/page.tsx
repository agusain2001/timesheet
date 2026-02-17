"use client";

import { useRouter } from "next/navigation";
import {
    User,
    Shield,
    Bell,
    Eye,
    ChevronRight,
} from "lucide-react";

const SETTINGS_CARDS = [
    {
        title: "Profile Information",
        description: "Update your personal details and contact information.",
        icon: User,
        color: "#3b82f6",
        meta: "Last updated 5 days ago",
        href: "/settings/profile",
    },
    {
        title: "Security Settings",
        description: "Manage password, login sessions, and account protection.",
        icon: Shield,
        color: "#a855f7",
        meta: "2 active sessions",
        href: "/settings/security",
    },
    {
        title: "Notifications",
        description: "Control email reminders and approval alerts.",
        icon: Bell,
        color: "#f59e0b",
        meta: "3 active preferences",
        href: "/settings/notifications",
    },
    {
        title: "Privacy Settings",
        description: "Control visibility of your timesheet and profile.",
        icon: Eye,
        color: "#10b981",
        meta: "Last updated 5 days ago",
        href: "/settings/privacy",
    },
];

export default function SettingsPage() {
    const router = useRouter();

    return (
        <div className="space-y-6 max-w-[900px] mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">My Settings</h1>
                <p className="text-sm text-foreground/50 mt-1">
                    Manage your personal preferences, account security, and system experience.
                </p>
            </div>

            {/* Settings Cards */}
            <div className="space-y-4">
                {SETTINGS_CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                        <button
                            key={card.title}
                            onClick={() => router.push(card.href)}
                            className="w-full text-left group rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.05] transition-all duration-200 p-5 cursor-pointer"
                        >
                            <div className="flex items-start gap-4">
                                {/* Color accent bar */}
                                <div
                                    className="w-1 self-stretch rounded-full shrink-0"
                                    style={{ backgroundColor: card.color }}
                                />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-base font-semibold text-foreground group-hover:text-blue-400 transition-colors">
                                            {card.title}
                                        </h3>
                                        <ChevronRight
                                            size={16}
                                            className="text-foreground/30 group-hover:text-foreground/60 transition-colors shrink-0"
                                        />
                                    </div>
                                    <p className="text-sm text-foreground/50 mt-0.5">
                                        {card.description}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-xs text-foreground/40">
                                            {card.meta}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
