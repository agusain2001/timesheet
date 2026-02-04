'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    CheckCircle, XCircle, Clock, DollarSign, User, Building,
    Calendar, ChevronDown, Search, Filter, AlertCircle, Loader2
} from 'lucide-react';
import {
    getPendingExpenses, approveExpense, rejectExpense, returnExpense,
    type Expense,
    getStatusColor, getStatusLabel, formatCurrency
} from '@/services/expenses';

export default function ExpenseApprovalsPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [rejectModal, setRejectModal] = useState<{ id: string; isReturn: boolean } | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // Load pending expenses
    const loadExpenses = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getPendingExpenses();
            setExpenses(data);
        } catch (error) {
            console.error('Failed to load pending expenses:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadExpenses();
    }, [loadExpenses]);

    // Filter expenses
    const filteredExpenses = expenses.filter(expense =>
        expense.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Approve expense
    const handleApprove = async (id: string) => {
        try {
            setActionLoadingId(id);
            await approveExpense(id);
            setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (error) {
            console.error('Failed to approve expense:', error);
            alert('Failed to approve expense');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Reject/Return expense
    const handleReject = async () => {
        if (!rejectModal || !rejectReason.trim()) return;

        try {
            setActionLoadingId(rejectModal.id);
            if (rejectModal.isReturn) {
                await returnExpense(rejectModal.id, rejectReason);
            } else {
                await rejectExpense(rejectModal.id, rejectReason);
            }
            setExpenses(prev => prev.filter(e => e.id !== rejectModal.id));
            setRejectModal(null);
            setRejectReason('');
        } catch (error) {
            console.error('Failed to reject expense:', error);
            alert('Failed to reject expense');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Calculate totals
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.total_amount, 0);

    return (
        <div className="approvals-page space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Expense Approvals</h1>
                    <p className="text-foreground/60 text-sm mt-1">
                        Review and approve expense claims
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-foreground/5 rounded-xl p-4">
                    <p className="text-sm text-foreground/60">Pending</p>
                    <p className="text-2xl font-bold mt-1">{filteredExpenses.length}</p>
                </div>
                <div className="bg-foreground/5 rounded-xl p-4">
                    <p className="text-sm text-foreground/60">Total Amount</p>
                    <p className="text-2xl font-bold mt-1 text-green-400">
                        {formatCurrency(totalAmount)}
                    </p>
                </div>
                <div className="bg-foreground/5 rounded-xl p-4">
                    <p className="text-sm text-foreground/60">Submitters</p>
                    <p className="text-2xl font-bold mt-1">
                        {new Set(filteredExpenses.map(e => e.user_id)).size}
                    </p>
                </div>
                <div className="bg-foreground/5 rounded-xl p-4">
                    <p className="text-sm text-foreground/60">Avg. Amount</p>
                    <p className="text-2xl font-bold mt-1">
                        {formatCurrency(filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0)}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                    <input
                        type="text"
                        placeholder="Search by title, submitter, or vendor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button className="px-3 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-sm flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                </button>
            </div>

            {/* Expenses List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : filteredExpenses.length === 0 ? (
                <div className="bg-foreground/5 rounded-xl p-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <p className="text-foreground/60">No pending expenses to approve</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredExpenses.map(expense => (
                        <div key={expense.id} className="bg-foreground/5 rounded-xl p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <Link
                                            href={`/my-expense/${expense.id}`}
                                            className="font-semibold hover:text-blue-400 transition-colors text-lg"
                                        >
                                            {expense.title}
                                        </Link>
                                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(expense.status)}`}>
                                            {getStatusLabel(expense.status)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-foreground/60 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <User className="w-4 h-4" />
                                            {expense.user_name || 'Unknown'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(expense.submitted_at || expense.created_at).toLocaleDateString()}
                                        </span>
                                        {expense.vendor && (
                                            <span className="flex items-center gap-1">
                                                <Building className="w-4 h-4" />
                                                {expense.vendor}
                                            </span>
                                        )}
                                        {expense.project_name && (
                                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                                                {expense.project_name}
                                            </span>
                                        )}
                                    </div>
                                    {expense.description && (
                                        <p className="text-sm text-foreground/50 mt-2 line-clamp-1">
                                            {expense.description}
                                        </p>
                                    )}
                                </div>

                                {/* Amount */}
                                <div className="text-right lg:w-40">
                                    <p className="text-2xl font-bold text-green-400">
                                        {formatCurrency(expense.total_amount, expense.currency)}
                                    </p>
                                    <p className="text-xs text-foreground/50 mt-1">
                                        {expense.items?.length || 0} items
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 lg:w-auto">
                                    <button
                                        onClick={() => handleApprove(expense.id)}
                                        disabled={actionLoadingId === expense.id}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {actionLoadingId === expense.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4" />
                                        )}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => setRejectModal({ id: expense.id, isReturn: false })}
                                        disabled={actionLoadingId === expense.id}
                                        className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => setRejectModal({ id: expense.id, isReturn: true })}
                                        disabled={actionLoadingId === expense.id}
                                        className="px-4 py-2 bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        Return
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject/Return Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background border border-foreground/10 rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-lg font-semibold mb-4">
                            {rejectModal.isReturn ? 'Return Expense' : 'Reject Expense'}
                        </h2>
                        <p className="text-sm text-foreground/60 mb-4">
                            {rejectModal.isReturn
                                ? 'Provide a reason for returning this expense for revision.'
                                : 'Provide a reason for rejecting this expense.'
                            }
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Enter reason..."
                            rows={4}
                            className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex items-center justify-end gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setRejectModal(null);
                                    setRejectReason('');
                                }}
                                className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim() || actionLoadingId !== null}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 ${rejectModal.isReturn
                                        ? 'bg-orange-600 hover:bg-orange-500'
                                        : 'bg-red-600 hover:bg-red-500'
                                    }`}
                            >
                                {actionLoadingId !== null && <Loader2 className="w-4 h-4 animate-spin" />}
                                {rejectModal.isReturn ? 'Return' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
