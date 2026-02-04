'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart,
    Calendar, ArrowLeft, Download, RefreshCw, Loader2
} from 'lucide-react';
import {
    getExpenseAnalytics, getMonthlyTrends, getCategoryBreakdown,
    type ExpenseAnalytics, type MonthlyTrend, type CategoryBreakdown,
    formatCurrency
} from '@/services/expenses';

export default function ExpenseAnalyticsPage() {
    const [analytics, setAnalytics] = useState<ExpenseAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('month');
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        async function loadAnalytics() {
            try {
                setLoading(true);
                const data = await getExpenseAnalytics({ year });
                setAnalytics(data);
            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setLoading(false);
            }
        }
        loadAnalytics();
    }, [year, dateRange]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const stats = analytics?.stats || {
        total_amount: 0,
        total_count: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        average_amount: 0
    };

    const monthlyTrends = analytics?.monthly_trends || [];
    const byCategory = analytics?.by_category || [];
    const byProject = analytics?.by_project || [];
    const budgetComparison = analytics?.budget_comparison || [];

    // Calculate max for chart scaling
    const maxMonthlyAmount = Math.max(...monthlyTrends.map(t => t.amount), 1);
    const maxCategoryAmount = Math.max(...byCategory.map(c => c.amount), 1);

    return (
        <div className="analytics-page space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/my-expense"
                        className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Expense Analytics</h1>
                        <p className="text-foreground/60 text-sm mt-1">
                            Insights and trends for your expenses
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <Link
                        href="/my-expense/reports"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white"
                    >
                        <Download className="w-4 h-4" />
                        Export Report
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPICard
                    title="Total Expenses"
                    value={formatCurrency(stats.total_amount)}
                    icon={DollarSign}
                    color="green"
                />
                <KPICard
                    title="Total Claims"
                    value={stats.total_count.toString()}
                    icon={BarChart3}
                    color="blue"
                />
                <KPICard
                    title="Average Amount"
                    value={formatCurrency(stats.average_amount)}
                    icon={TrendingUp}
                    color="purple"
                />
                <KPICard
                    title="Pending"
                    value={stats.pending_count.toString()}
                    icon={Calendar}
                    color="yellow"
                />
                <KPICard
                    title="Approved"
                    value={stats.approved_count.toString()}
                    icon={TrendingUp}
                    color="emerald"
                />
                <KPICard
                    title="Rejected"
                    value={stats.rejected_count.toString()}
                    icon={TrendingDown}
                    color="red"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trends */}
                <div className="bg-foreground/5 rounded-xl p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        Monthly Trends
                    </h2>
                    <div className="h-64 flex items-end gap-2">
                        {monthlyTrends.length > 0 ? (
                            monthlyTrends.map((trend, idx) => {
                                const height = (trend.amount / maxMonthlyAmount) * 100;
                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all hover:from-blue-500 hover:to-blue-300"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                            title={formatCurrency(trend.amount)}
                                        />
                                        <span className="text-xs text-foreground/50 mt-2">
                                            {trend.month.slice(0, 3)}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-foreground/50">
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-foreground/5 rounded-xl p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-purple-400" />
                        By Category
                    </h2>
                    <div className="space-y-3">
                        {byCategory.length > 0 ? (
                            byCategory.slice(0, 6).map((cat, idx) => {
                                const width = (cat.amount / maxCategoryAmount) * 100;
                                const colors = [
                                    'bg-blue-500', 'bg-purple-500', 'bg-green-500',
                                    'bg-yellow-500', 'bg-red-500', 'bg-pink-500'
                                ];
                                return (
                                    <div key={idx}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="capitalize">{cat.category}</span>
                                            <span className="text-foreground/60">
                                                {formatCurrency(cat.amount)} ({cat.percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${colors[idx % colors.length]}`}
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-48 flex items-center justify-center text-foreground/50">
                                No data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Project & Budget Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Project */}
                <div className="bg-foreground/5 rounded-xl p-6">
                    <h2 className="font-semibold mb-4">By Project</h2>
                    <div className="space-y-3">
                        {byProject.length > 0 ? (
                            byProject.slice(0, 5).map((proj, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-lg">
                                    <div>
                                        <p className="font-medium">{proj.project}</p>
                                        <p className="text-xs text-foreground/50">{proj.count} expenses</p>
                                    </div>
                                    <p className="font-mono font-medium text-green-400">
                                        {formatCurrency(proj.amount)}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="h-48 flex items-center justify-center text-foreground/50">
                                No project data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Budget vs Actual */}
                <div className="bg-foreground/5 rounded-xl p-6">
                    <h2 className="font-semibold mb-4">Budget vs Actual</h2>
                    <div className="space-y-4">
                        {budgetComparison.length > 0 ? (
                            budgetComparison.slice(0, 4).map((item, idx) => {
                                const percentage = item.budget > 0 ? (item.actual / item.budget) * 100 : 0;
                                const isOver = percentage > 100;
                                return (
                                    <div key={idx}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span>{item.cost_center}</span>
                                            <span className={isOver ? 'text-red-400' : 'text-green-400'}>
                                                {formatCurrency(item.actual)} / {formatCurrency(item.budget)}
                                            </span>
                                        </div>
                                        <div className="h-3 bg-foreground/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-foreground/50 mt-1">
                                            {isOver ? 'Over budget by ' : 'Under budget by '}
                                            {formatCurrency(Math.abs(item.variance))} ({Math.abs(item.variance_percentage).toFixed(1)}%)
                                        </p>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-48 flex items-center justify-center text-foreground/50">
                                No budget data available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({
    title,
    value,
    icon: Icon,
    color
}: {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color: 'green' | 'blue' | 'purple' | 'yellow' | 'emerald' | 'red'
}) {
    const colorClasses = {
        green: 'bg-green-500/20 text-green-400',
        blue: 'bg-blue-500/20 text-blue-400',
        purple: 'bg-purple-500/20 text-purple-400',
        yellow: 'bg-yellow-500/20 text-yellow-400',
        emerald: 'bg-emerald-500/20 text-emerald-400',
        red: 'bg-red-500/20 text-red-400',
    };

    return (
        <div className="bg-foreground/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs text-foreground/50">{title}</p>
        </div>
    );
}
