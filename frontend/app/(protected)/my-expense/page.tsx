'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Plus, Search, Filter, Download, ChevronDown, Receipt,
    Clock, CheckCircle, XCircle, DollarSign, AlertCircle,
    MoreHorizontal, Eye, Edit, Trash2, Send, FileText
} from 'lucide-react';
import {
    getMyExpenses, getExpenseDashboardStats,
    deleteExpense, submitExpense,
    type Expense, type ExpenseStatus, type ExpenseDashboardStats,
    getStatusColor, getStatusLabel, formatCurrency
} from '@/services/expenses';

// Status tabs configuration
const STATUS_TABS = [
    { key: 'all', label: 'All Expenses', icon: FileText },
    { key: 'draft', label: 'Drafts', icon: Edit },
    { key: 'submitted', label: 'Submitted', icon: Send },
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'approved', label: 'Approved', icon: CheckCircle },
    { key: 'rejected', label: 'Rejected', icon: XCircle },
    { key: 'paid', label: 'Paid', icon: DollarSign },
] as const;

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [stats, setStats] = useState<ExpenseDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);

    // Load expenses
    const loadExpenses = useCallback(async () => {
        try {
            setLoading(true);
            const params = activeTab !== 'all' ? { status: activeTab as ExpenseStatus } : {};
            const [expensesData, statsData] = await Promise.all([
                getMyExpenses(params),
                getExpenseDashboardStats()
            ]);
            setExpenses(expensesData);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load expenses:', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadExpenses();
    }, [loadExpenses]);

    // Filter expenses by search
    const filteredExpenses = expenses.filter(expense =>
        expense.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle expense deletion
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            await deleteExpense(id);
            setExpenses(prev => prev.filter(e => e.id !== id));
            setActionMenuId(null);
        } catch (error) {
            console.error('Failed to delete expense:', error);
            alert('Failed to delete expense');
        }
    };

    // Handle expense submission
    const handleSubmit = async (id: string) => {
        try {
            const updated = await submitExpense(id);
            setExpenses(prev => prev.map(e => e.id === id ? updated : e));
            setActionMenuId(null);
        } catch (error) {
            console.error('Failed to submit expense:', error);
            alert('Failed to submit expense');
        }
    };

    // Toggle expense selection
    const toggleSelection = (id: string) => {
        setSelectedExpenses(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Select all visible expenses
    const selectAll = () => {
        if (selectedExpenses.size === filteredExpenses.length) {
            setSelectedExpenses(new Set());
        } else {
            setSelectedExpenses(new Set(filteredExpenses.map(e => e.id)));
        }
    };

    return (
        <div className="expenses-page space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Expenses</h1>
                    <p className="text-foreground/60 text-sm mt-1">
                        Manage your expense claims and reimbursements
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/my-expense/analytics"
                        className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Receipt className="w-4 h-4" />
                        Analytics
                    </Link>
                    <Link
                        href="/my-expense/create"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white"
                    >
                        <Plus className="w-4 h-4" />
                        New Expense
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Expenses"
                        value={formatCurrency(stats.total_expenses)}
                        icon={DollarSign}
                        color="blue"
                    />
                    <StatCard
                        title="My Expenses"
                        value={stats.my_expenses_count.toString()}
                        icon={FileText}
                        color="purple"
                    />
                    <StatCard
                        title="Pending Approval"
                        value={stats.my_pending_count.toString()}
                        icon={Clock}
                        color="yellow"
                    />
                    <StatCard
                        title="Approved This Month"
                        value={stats.approved_this_month.toString()}
                        icon={CheckCircle}
                        color="green"
                    />
                </div>
            )}

            {/* Filters & Search */}
            <div className="bg-foreground/5 rounded-xl p-4 space-y-4">
                {/* Status Tabs */}
                <div className="flex flex-wrap gap-2">
                    {STATUS_TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-foreground/5 hover:bg-foreground/10 text-foreground/70'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Search & Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Search expenses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-foreground/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-sm flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filters
                        </button>
                        <button className="px-3 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-sm flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-foreground/5 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-foreground/10">
                            <th className="px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={selectedExpenses.size === filteredExpenses.length && filteredExpenses.length > 0}
                                    onChange={selectAll}
                                    className="rounded border-foreground/20"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60">Title</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60 hidden md:table-cell">Vendor</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-foreground/60">Amount</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-foreground/60">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-foreground/60 hidden lg:table-cell">Date</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-foreground/60">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-foreground/50">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        Loading expenses...
                                    </div>
                                </td>
                            </tr>
                        ) : filteredExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-foreground/50">
                                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No expenses found</p>
                                    <Link
                                        href="/my-expense/create"
                                        className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
                                    >
                                        Create your first expense
                                    </Link>
                                </td>
                            </tr>
                        ) : (
                            filteredExpenses.map(expense => (
                                <tr
                                    key={expense.id}
                                    className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedExpenses.has(expense.id)}
                                            onChange={() => toggleSelection(expense.id)}
                                            className="rounded border-foreground/20"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/my-expense/${expense.id}`}
                                            className="font-medium hover:text-blue-400 transition-colors"
                                        >
                                            {expense.title}
                                        </Link>
                                        {expense.description && (
                                            <p className="text-xs text-foreground/50 mt-0.5 truncate max-w-[200px]">
                                                {expense.description}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-foreground/70 hidden md:table-cell">
                                        {expense.vendor || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {formatCurrency(expense.total_amount, expense.currency)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                                            {getStatusLabel(expense.status)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-foreground/60 text-sm hidden lg:table-cell">
                                        {new Date(expense.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="relative inline-block">
                                            <button
                                                onClick={() => setActionMenuId(actionMenuId === expense.id ? null : expense.id)}
                                                className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                            {actionMenuId === expense.id && (
                                                <div className="absolute right-0 top-full mt-1 w-40 bg-background border border-foreground/10 rounded-lg shadow-lg z-10 py-1">
                                                    <Link
                                                        href={`/my-expense/${expense.id}`}
                                                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-foreground/5"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View
                                                    </Link>
                                                    {expense.status === 'draft' && (
                                                        <>
                                                            <Link
                                                                href={`/my-expense/${expense.id}/edit`}
                                                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-foreground/5"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Edit
                                                            </Link>
                                                            <button
                                                                onClick={() => handleSubmit(expense.id)}
                                                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-foreground/5 w-full text-left text-blue-400"
                                                            >
                                                                <Send className="w-4 h-4" />
                                                                Submit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(expense.id)}
                                                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-foreground/5 w-full text-left text-red-400"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bulk Actions */}
            {selectedExpenses.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4">
                    <span className="text-sm text-foreground/70">
                        {selectedExpenses.size} selected
                    </span>
                    <button
                        onClick={() => setSelectedExpenses(new Set())}
                        className="text-sm text-foreground/60 hover:text-foreground"
                    >
                        Clear
                    </button>
                    <div className="w-px h-6 bg-foreground/20" />
                    <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm">
                        Submit All
                    </button>
                    <button className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm">
                        Delete All
                    </button>
                </div>
            )}
        </div>
    );
}

// Stat Card Component
function StatCard({
    title,
    value,
    icon: Icon,
    color
}: {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color: 'blue' | 'purple' | 'yellow' | 'green'
}) {
    const colorClasses = {
        blue: 'bg-blue-500/20 text-blue-400',
        purple: 'bg-purple-500/20 text-purple-400',
        yellow: 'bg-yellow-500/20 text-yellow-400',
        green: 'bg-green-500/20 text-green-400',
    };

    return (
        <div className="bg-foreground/5 rounded-xl p-4">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-foreground/60">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}
