'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Save, Plus, Trash2, Calendar,
    DollarSign, Building, Receipt, Loader2
} from 'lucide-react';
import { ReceiptUpload } from '@/components/features/ReceiptUpload';
import {
    getExpense, updateExpense, getExpenseCategories, getCostCenters,
    type Expense, type ExpenseUpdate, type ExpenseType, type PaymentMethod,
    type ExpenseCategory, type CostCenter,
    getExpenseTypeLabel, getPaymentMethodLabel
} from '@/services/expenses';
import { getProjects } from '@/services/projects';

interface LineItem {
    id: string;
    date: string;
    expense_type: ExpenseType;
    category_id: string;
    amount: number;
    currency: string;
    description: string;
    vendor: string;
}

const EXPENSE_TYPES: ExpenseType[] = [
    'meal', 'transport', 'accommodation', 'supplies',
    'communication', 'entertainment', 'travel', 'software', 'equipment', 'other'
];

const PAYMENT_METHODS: PaymentMethod[] = [
    'cash', 'credit_card', 'debit_card', 'bank_transfer', 'company_card', 'petty_cash', 'other'
];

const CURRENCIES = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'];

export default function EditExpensePage() {
    const params = useParams();
    const router = useRouter();
    const expenseId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expense, setExpense] = useState<Expense | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [vendor, setVendor] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [projectId, setProjectId] = useState('');
    const [costCenterId, setCostCenterId] = useState('');
    const [currency, setCurrency] = useState('EGP');

    // Line items (read-only for now - editing items would require additional API)
    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    // Reference data
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [costCenters, setCostCentersState] = useState<CostCenter[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

    // Load expense and reference data
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const [expenseData, categoriesData, costCentersData, projectsData] = await Promise.all([
                    getExpense(expenseId),
                    getExpenseCategories().catch(() => []),
                    getCostCenters().catch(() => []),
                    getProjects().catch(() => [])
                ]);

                setExpense(expenseData);
                setTitle(expenseData.title);
                setDescription(expenseData.description || '');
                setVendor(expenseData.vendor || '');
                setPaymentMethod(expenseData.payment_method);
                setProjectId(expenseData.project_id || '');
                setCostCenterId(expenseData.cost_center_id || '');
                setCurrency(expenseData.currency);

                if (expenseData.items) {
                    setLineItems(expenseData.items.map(item => ({
                        id: item.id,
                        date: item.date,
                        expense_type: item.expense_type,
                        category_id: item.category_id || '',
                        amount: item.amount,
                        currency: item.currency,
                        description: item.description || '',
                        vendor: item.vendor || ''
                    })));
                }

                setCategories(categoriesData);
                setCostCentersState(costCentersData);
                setProjects(projectsData);
            } catch (error) {
                console.error('Failed to load expense:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [expenseId]);

    // Calculate total
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Save changes
    const handleSave = async () => {
        if (!title.trim()) {
            alert('Please enter a title');
            return;
        }

        try {
            setSaving(true);
            const updateData: ExpenseUpdate = {
                title,
                description: description || undefined,
                vendor: vendor || undefined,
                payment_method: paymentMethod,
                project_id: projectId || undefined,
                cost_center_id: costCenterId || undefined,
                currency
            };

            await updateExpense(expenseId, updateData);
            router.push(`/my-expense/${expenseId}`);
        } catch (error) {
            console.error('Failed to save expense:', error);
            alert('Failed to save expense');
        } finally {
            setSaving(false);
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
                <p className="text-foreground/60">Expense not found</p>
                <Link href="/my-expense" className="text-blue-400 hover:text-blue-300">
                    Back to Expenses
                </Link>
            </div>
        );
    }

    if (expense.status !== 'draft' && expense.status !== 'returned') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-foreground/60">This expense cannot be edited</p>
                <Link href={`/my-expense/${expenseId}`} className="text-blue-400 hover:text-blue-300">
                    View Expense
                </Link>
            </div>
        );
    }

    return (
        <div className="edit-expense-page max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/my-expense/${expenseId}`}
                    className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Edit Expense</h1>
                    <p className="text-foreground/60 text-sm">Update expense details</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>

            {/* Main Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-foreground/5 rounded-xl p-6 space-y-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-blue-400" />
                            Expense Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm text-foreground/60 mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm text-foreground/60 mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-foreground/60 mb-1">Vendor</label>
                                <input
                                    type="text"
                                    value={vendor}
                                    onChange={(e) => setVendor(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-foreground/60 mb-1">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {PAYMENT_METHODS.map(method => (
                                        <option key={method} value={method}>
                                            {getPaymentMethodLabel(method)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Line Items (Read-only display) */}
                    <div className="bg-foreground/5 rounded-xl p-6 space-y-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-400" />
                            Expense Items ({lineItems.length})
                        </h2>

                        <div className="space-y-3">
                            {lineItems.map((item, index) => (
                                <div key={item.id} className="bg-background rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{item.description || `Item ${index + 1}`}</p>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-foreground/60">
                                                <span>{new Date(item.date).toLocaleDateString()}</span>
                                                <span className="px-2 py-0.5 bg-foreground/10 rounded text-xs">
                                                    {getExpenseTypeLabel(item.expense_type)}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="font-mono font-medium text-green-400">
                                            {item.currency} {item.amount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between pt-4 border-t border-foreground/10">
                            <span className="font-medium">Total Amount</span>
                            <span className="text-2xl font-bold text-green-400">
                                {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column - Allocation */}
                <div className="space-y-6">
                    <div className="bg-foreground/5 rounded-xl p-6 space-y-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Building className="w-5 h-5 text-purple-400" />
                            Allocation
                        </h2>

                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Project</label>
                            <select
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select project...</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Cost Center</label>
                            <select
                                value={costCenterId}
                                onChange={(e) => setCostCenterId(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select cost center...</option>
                                {costCenters.map(cc => (
                                    <option key={cc.id} value={cc.id}>
                                        {cc.name} ({cc.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Currency</label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {CURRENCIES.map(curr => (
                                    <option key={curr} value={curr}>{curr}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
