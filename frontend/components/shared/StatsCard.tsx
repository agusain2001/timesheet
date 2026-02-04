"use client";

import { ReactNode } from "react";

// =============== Types ===============

export interface StatsCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    change?: {
        value: number;
        type: "increase" | "decrease" | "neutral";
    };
    subtitle?: string;
    color?: "blue" | "green" | "purple" | "orange" | "red" | "cyan";
    onClick?: () => void;
}

// =============== Icons ===============

const TrendUpIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const TrendDownIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
    </svg>
);

// =============== Color Mappings ===============

const colorClasses = {
    blue: {
        bg: "bg-blue-500/10",
        icon: "text-blue-500",
        gradient: "from-blue-500 to-blue-600",
    },
    green: {
        bg: "bg-emerald-500/10",
        icon: "text-emerald-500",
        gradient: "from-emerald-500 to-emerald-600",
    },
    purple: {
        bg: "bg-purple-500/10",
        icon: "text-purple-500",
        gradient: "from-purple-500 to-purple-600",
    },
    orange: {
        bg: "bg-orange-500/10",
        icon: "text-orange-500",
        gradient: "from-orange-500 to-orange-600",
    },
    red: {
        bg: "bg-red-500/10",
        icon: "text-red-500",
        gradient: "from-red-500 to-red-600",
    },
    cyan: {
        bg: "bg-cyan-500/10",
        icon: "text-cyan-500",
        gradient: "from-cyan-500 to-cyan-600",
    },
};

// =============== Main Component ===============

export function StatsCard({
    title,
    value,
    icon,
    change,
    subtitle,
    color = "blue",
    onClick,
}: StatsCardProps) {
    const colors = colorClasses[color];

    return (
        <div
            onClick={onClick}
            className={`bg-background border border-foreground/10 rounded-xl p-5 transition-all duration-200 ${onClick
                    ? "cursor-pointer hover:border-foreground/20 hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5"
                    : ""
                }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-foreground/60 font-medium">{title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{value}</p>

                    {/* Change indicator */}
                    {change && (
                        <div className="flex items-center gap-1 mt-2">
                            <span
                                className={`flex items-center gap-0.5 text-sm font-medium ${change.type === "increase"
                                        ? "text-emerald-500"
                                        : change.type === "decrease"
                                            ? "text-red-500"
                                            : "text-foreground/50"
                                    }`}
                            >
                                {change.type === "increase" && <TrendUpIcon />}
                                {change.type === "decrease" && <TrendDownIcon />}
                                {change.type === "increase" ? "+" : ""}
                                {change.value}%
                            </span>
                            <span className="text-xs text-foreground/40">vs last week</span>
                        </div>
                    )}

                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-xs text-foreground/40 mt-2">{subtitle}</p>
                    )}
                </div>

                {/* Icon */}
                <div className={`p-3 rounded-xl ${colors.bg}`}>
                    <div className={colors.icon}>{icon}</div>
                </div>
            </div>
        </div>
    );
}

// =============== Stats Card with Progress ===============

interface StatsCardWithProgressProps extends StatsCardProps {
    progress: number; // 0-100
    progressLabel?: string;
}

export function StatsCardWithProgress({
    title,
    value,
    icon,
    progress,
    progressLabel,
    color = "blue",
    onClick,
}: StatsCardWithProgressProps) {
    const colors = colorClasses[color];

    return (
        <div
            onClick={onClick}
            className={`bg-background border border-foreground/10 rounded-xl p-5 transition-all duration-200 ${onClick
                    ? "cursor-pointer hover:border-foreground/20 hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5"
                    : ""
                }`}
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm text-foreground/60 font-medium">{title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-xl ${colors.bg}`}>
                    <div className={colors.icon}>{icon}</div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
                <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${colors.gradient} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                </div>
                {progressLabel && (
                    <p className="text-xs text-foreground/40">{progressLabel}</p>
                )}
            </div>
        </div>
    );
}

// =============== Mini Stats Card ===============

interface MiniStatsCardProps {
    label: string;
    value: string | number;
    icon: ReactNode;
    color?: "blue" | "green" | "purple" | "orange" | "red" | "cyan";
}

export function MiniStatsCard({ label, value, icon, color = "blue" }: MiniStatsCardProps) {
    const colors = colorClasses[color];

    return (
        <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-lg">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
                <div className={colors.icon}>{icon}</div>
            </div>
            <div>
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-xs text-foreground/50">{label}</p>
            </div>
        </div>
    );
}

// =============== Stats Grid ===============

interface StatsGridProps {
    children: ReactNode;
    columns?: 2 | 3 | 4;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
    const gridCols = {
        2: "grid-cols-1 sm:grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    };

    return <div className={`grid ${gridCols[columns]} gap-4`}>{children}</div>;
}

export default StatsCard;
