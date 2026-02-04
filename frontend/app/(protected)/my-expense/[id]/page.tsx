'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Edit, Send, CheckCircle, XCircle, DollarSign,
    Clock, FileText, Receipt, User, Calendar, Building,
    CreditCard, AlertCircle, Download, Trash2, RotateCcw, Loader2
} from 'lucide-react';
import {
    getExpense, getExpenseApprovals, getExpenseAuditLog,
    submitExpense, deleteExpense,
    type Expense, type ExpenseApproval, type ExpenseAuditLog,
    getStatusColor, getStatusLabel, formatCurrency,
    getExpenseTypeLabel, getPaymentMethodLabel
} from '@/services/expenses';

export default function ExpenseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const expenseId = params.id as string;

    const [expense, setExpense] = useState<Expense | null>(null);
    const [approvals, setApprovals] = useState<ExpenseApproval[]>([]);
    const [auditLogs, setAuditLogs] = useState<ExpenseAuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'approvals' | 'audit'>('details');

    // Load expense data
    useEffect(() => {
        async function loadExpense() {
            try {
                setLoading(true);
                const [expenseData, approvalsData, auditData] = await Promise.all([
                    getExpense(expenseId),
                    getExpenseApprovals(expenseId).catch(() => []),
                    getExpenseAuditLog(expenseId).catch(() => [])
                ]);
                setExpense(expenseData);
                setApprovals(approvalsData);
                setAuditLogs(auditData);
            } catch (error) {
                console.error('Failed to load expense:', error);
            } finally {
                setLoading(false);
            }
        }
        loadExpense();
    }, [expenseId]);

    // Handle submit
    const handleSubmit = async () => {
        try {
            setActionLoading(true);
            const updated = await submitExpense(expenseId);
            setExpense(updated);
        } catch (error) {
            console.error('Failed to submit expense:', error);
            alert('Failed to submit expense');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            setActionLoading(true);
            await deleteExpense(expenseId);
            router.push('/my-expense');
        } catch (error) {
            console.error('Failed to delete expense:', error);
            alert('Failed to delete expense');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!expense) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-foreground/60">Expense not found</p>
                <Link href="/my-expense" className="text-blue-400 hover:text-blue-300">
                    Back to Expenses
                </Link>
            </div>
        );
    }

    return (
        <div className="expense-detail-page max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <Link
                    href="/my-expense"
                    className="p-2 hover:bg-foreground/5 rounded-lg transition-colors w-fit"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold">{expense.title}</h1>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(expense.status)}`}>
                            {getStatusLabel(expense.status)}
                        </span>
                    </div>
                    {expense.description && (
                        <p className="text-foreground/60 mt-1">{expense.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {expense.status === 'draft' && (
                        <>
                            <Link
                                href={`/my-expense/${expense.id}/edit`}
                                className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </Link>
                            <button
                                onClick={handleSubmit}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Submit
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Amount Card */}
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl p-6 border border-green-500/30">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-foreground/60">Total Amount</p>
                        <p className="text-4xl font-bold text-green-400 mt-1">
                            {formatCurrency(expense.total_amount, expense.currency)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-foreground/60">Payment Method</p>
                        <p className="text-lg font-medium mt-1">{getPaymentMethodLabel(expense.payment_method)}</p>
                    </div>
                </div>
            </div>

            {/* Rejection/Return Reason */}
            {expense.rejection_reason && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-400">Rejection Reason</p>
                        <p className="text-sm text-foreground/70 mt-1">{expense.rejection_reason}</p>
                    </div>
                </div>
            )}

            {expense.return_reason && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
                    <RotateCcw className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-orange-400">Return Reason</p>
                        <p className="text-sm text-foreground/70 mt-1">{expense.return_reason}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-foreground/10 pb-2">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'details' ? 'bg-foreground/10 text-foreground' : 'text-foreground/60 hover:text-foreground'
                        }`}
                >
                    Details
                </button>
                <button
                    onClick={() => setActiveTab('approvals')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'approvals' ? 'bg-foreground/10 text-foreground' : 'text-foreground/60 hover:text-foreground'
                        }`}
                >
                    Approvals
                    <span className="px-1.5 py-0.5 bg-foreground/10 rounded text-xs">
                        {approvals.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'audit' ? 'bg-foreground/10 text-foreground' : 'text-foreground/60 hover:text-foreground'
                        }`}
                >
                    Audit Log
                    <span className="px-1.5 py-0.5 bg-foreground/10 rounded text-xs">
                        {auditLogs.length}
                    </span>
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Line Items */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-foreground/5 rounded-xl p-6">
                            <h2 className="font-semibold mb-4 flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-blue-400" />
                                Expense Items ({expense.items?.length || 0})
                            </h2>

                            {expense.items && expense.items.length > 0 ? (
                                <div className="space-y-3">
                                    {expense.items.map((item, idx) => (
                                        <div key={item.id} className="bg-background rounded-lg p-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium">{item.description || `Item ${idx + 1}`}</p>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-foreground/60">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(item.date).toLocaleDateString()}
                                                        </span>
                                                        <span className="px-2 py-0.5 bg-foreground/10 rounded text-xs">
                                                            {getExpenseTypeLabel(item.expense_type)}
                                                        </span>
                                                        {item.vendor && (
                                                            <span className="flex items-center gap-1">
                                                                <Building className="w-3 h-3" />
                                                                {item.vendor}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="font-mono font-medium text-green-400">
                                                    {formatCurrency(item.amount, item.currency)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-foreground/50 text-center py-8">No items added</p>
                            )}
                        </div>
                    </div>

                    {/* Info Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-foreground/5 rounded-xl p-6 space-y-4">
                            <h2 className="font-semibold">Details</h2>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-foreground/60 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Submitted by
                                    </span>
                                    <span>{expense.user_name || 'You'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-foreground/60 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Created
                                    </span>
                                    <span>{new Date(expense.created_at).toLocaleDateString()}</span>
                                </div>
                                {expense.submitted_at && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-foreground/60 flex items-center gap-2">
                                            <Send className="w-4 h-4" />
                                            Submitted
                                        </span>
                                        <span>{new Date(expense.submitted_at).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {expense.vendor && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-foreground/60 flex items-center gap-2">
                                            <Building className="w-4 h-4" />
                                            Vendor
                                        </span>
                                        <span>{expense.vendor}</span>
                                    </div>
                                )}
                                {expense.project_name && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-foreground/60 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Project
                                        </span>
                                        <span>{expense.project_name}</span>
                                    </div>
                                )}
                                {expense.cost_center_name && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-foreground/60 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4" />
                                            Cost Center
                                        </span>
                                        <span>{expense.cost_center_name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Approval Progress */}
                        <div className="bg-foreground/5 rounded-xl p-6 space-y-4">
                            <h2 className="font-semibold">Approval Progress</h2>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-foreground/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${expense.status === 'approved' || expense.status === 'paid'
                                            ? 'bg-green-500'
                                            : expense.status === 'rejected'
                                                ? 'bg-red-500'
                                                : 'bg-blue-500'
                                            }`}
                                        style={{
                                            width: `${(expense.current_approval_level / expense.required_approval_levels) * 100}%`
                                        }}
                                    />
                                </div>
                                <span className="text-sm text-foreground/60">
                                    {expense.current_approval_level}/{expense.required_approval_levels}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'approvals' && (
                <div className="bg-foreground/5 rounded-xl p-6">
                    <h2 className="font-semibold mb-4">Approval Timeline</h2>
                    {approvals.length > 0 ? (
                        <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-foreground/10" />
                            <div className="space-y-6">
                                {approvals.map((approval) => (
                                    <div key={approval.id} className="flex items-start gap-4 relative">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${approval.status === 'approved'
                                            ? 'bg-green-500'
                                            : approval.status === 'rejected'
                                                ? 'bg-red-500'
                                                : 'bg-foreground/20'
                                            }`}>
                                            {approval.status === 'approved' ? (
                                                <CheckCircle className="w-4 h-4" />
                                            ) : approval.status === 'rejected' ? (
                                                <XCircle className="w-4 h-4" />
                                            ) : (
                                                <Clock className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="flex-1 bg-background rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{approval.approver_name || 'Approver'}</p>
                                                    <p className="text-sm text-foreground/60">Level {approval.level}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs ${approval.status === 'approved'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : approval.status === 'rejected'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {approval.status}
                                                </span>
                                            </div>
                                            {approval.comments && (
                                                <p className="text-sm text-foreground/70 mt-2">{approval.comments}</p>
                                            )}
                                            {approval.decision_at && (
                                                <p className="text-xs text-foreground/50 mt-2">
                                                    {new Date(approval.decision_at).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-foreground/50 text-center py-8">No approval history yet</p>
                    )}
                </div>
            )}

            {activeTab === 'audit' && (
                <div className="bg-foreground/5 rounded-xl p-6">
                    <h2 className="font-semibold mb-4">Audit Log</h2>
                    {auditLogs.length > 0 ? (
                        <div className="space-y-3">
                            {auditLogs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 bg-background rounded-lg p-3">
                                    <div className="w-8 h-8 bg-foreground/10 rounded-full flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{log.user_name || 'User'}</span>
                                            <span className="text-foreground/60">{log.action}</span>
                                        </div>
                                        <p className="text-xs text-foreground/50 mt-0.5">
                                            {new Date(log.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-foreground/50 text-center py-8">No audit logs yet</p>
                    )}
                </div>
            )}
        </div>
    );
}
