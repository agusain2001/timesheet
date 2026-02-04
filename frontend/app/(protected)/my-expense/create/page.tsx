'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Save, Send, Plus, Trash2, Calendar,
    DollarSign, Building, CreditCard, Receipt, Loader2
} from 'lucide-react';
import { ReceiptUpload } from '@/components/features/ReceiptUpload';
import {
    createExpense, uploadReceipt, getExpenseCategories, getCostCenters,
    type ExpenseCreate, type ExpenseType, type PaymentMethod,
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

export default function CreateExpensePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [vendor, setVendor] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [projectId, setProjectId] = useState('');
    const [costCenterId, setCostCenterId] = useState('');
    const [currency, setCurrency] = useState('EGP');

    // Line items
    const [lineItems, setLineItems] = useState<LineItem[]>([{
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        expense_type: 'other',
        category_id: '',
        amount: 0,
        currency: 'EGP',
        description: '',
        vendor: ''
    }]);

    // Receipt files
    const [receiptFiles, setReceiptFiles] = useState<File[]>([]);

    // Reference data
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [costCenters, setCostCentersState] = useState<CostCenter[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

    // Load reference data
    useEffect(() => {
        async function loadData() {
            try {
                const [categoriesData, costCentersData, projectsData] = await Promise.all([
                    getExpenseCategories().catch(() => []),
                    getCostCenters().catch(() => []),
                    getProjects().catch(() => [])
                ]);
                setCategories(categoriesData);
                setCostCentersState(costCentersData);
                setProjects(projectsData);
            } catch (error) {
                console.error('Failed to load reference data:', error);
            }
        }
        loadData();
    }, []);

    // Calculate total
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Add line item
    const addLineItem = () => {
        setLineItems(prev => [...prev, {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            expense_type: 'other',
            category_id: '',
            amount: 0,
            currency: currency,
            description: '',
            vendor: ''
        }]);
    };

    // Update line item
    const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
        setLineItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    // Remove line item
    const removeLineItem = (id: string) => {
        if (lineItems.length === 1) return;
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    // Handle receipt upload
    const handleReceiptUpload = (files: File[]) => {
        setReceiptFiles(prev => [...prev, ...files]);
    };

    // Save as draft
    const handleSaveAsDraft = async () => {
        if (!title.trim()) {
            alert('Please enter a title');
            return;
        }

        try {
            setSaving(true);
            const expenseData: ExpenseCreate = {
                title,
                description,
                vendor,
                payment_method: paymentMethod,
                project_id: projectId || undefined,
                cost_center_id: costCenterId || undefined,
                currency,
                items: lineItems.map(item => ({
                    date: item.date,
                    expense_type: item.expense_type,
                    category_id: item.category_id || undefined,
                    amount: item.amount,
                    currency: item.currency || currency,
                    description: item.description,
                    vendor: item.vendor
                }))
            };

            const expense = await createExpense(expenseData);

            // Upload receipts
            for (const file of receiptFiles) {
                await uploadReceipt(expense.id, file);
            }

            router.push(`/my-expense/${expense.id}`);
        } catch (error) {
            console.error('Failed to save expense:', error);
            alert('Failed to save expense');
        } finally {
            setSaving(false);
        }
    };

    // Submit for approval
    const handleSubmit = async () => {
        if (!title.trim()) {
            alert('Please enter a title');
            return;
        }
        if (totalAmount <= 0) {
            alert('Please add at least one expense item with an amount');
            return;
        }

        // Save first, then submit will happen on detail page
        await handleSaveAsDraft();
    };

    return (
        <div className="create-expense-page max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/my-expense"
                    className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Create Expense</h1>
                    <p className="text-foreground/60 text-sm">Add a new expense claim</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSaveAsDraft}
                        disabled={saving}
                        className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Draft
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit
                    </button>
                </div>
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
                                    placeholder="e.g., Business Trip to Cairo"
                                    className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm text-foreground/60 mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide details about this expense..."
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
                                    placeholder="e.g., Hotel ABC"
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

                    {/* Line Items */}
                    <div className="bg-foreground/5 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-400" />
                                Expense Items
                            </h2>
                            <button
                                onClick={addLineItem}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" />
                                Add Item
                            </button>
                        </div>

                        <div className="space-y-4">
                            {lineItems.map((item, index) => (
                                <div key={item.id} className="bg-background rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-foreground/60">Item {index + 1}</span>
                                        {lineItems.length > 1 && (
                                            <button
                                                onClick={() => removeLineItem(item.id)}
                                                className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                            <label className="block text-xs text-foreground/50 mb-1">Date</label>
                                            <input
                                                type="date"
                                                value={item.date}
                                                onChange={(e) => updateLineItem(item.id, 'date', e.target.value)}
                                                className="w-full px-2 py-1.5 bg-foreground/5 border border-foreground/10 rounded text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-foreground/50 mb-1">Type</label>
                                            <select
                                                value={item.expense_type}
                                                onChange={(e) => updateLineItem(item.id, 'expense_type', e.target.value)}
                                                className="w-full px-2 py-1.5 bg-foreground/5 border border-foreground/10 rounded text-sm"
                                            >
                                                {EXPENSE_TYPES.map(type => (
                                                    <option key={type} value={type}>
                                                        {getExpenseTypeLabel(type)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-foreground/50 mb-1">Amount</label>
                                            <input
                                                type="number"
                                                value={item.amount || ''}
                                                onChange={(e) => updateLineItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                                className="w-full px-2 py-1.5 bg-foreground/5 border border-foreground/10 rounded text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-foreground/50 mb-1">Currency</label>
                                            <select
                                                value={item.currency}
                                                onChange={(e) => updateLineItem(item.id, 'currency', e.target.value)}
                                                className="w-full px-2 py-1.5 bg-foreground/5 border border-foreground/10 rounded text-sm"
                                            >
                                                {CURRENCIES.map(curr => (
                                                    <option key={curr} value={curr}>{curr}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-foreground/50 mb-1">Description</label>
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                                placeholder="Item description..."
                                                className="w-full px-2 py-1.5 bg-foreground/5 border border-foreground/10 rounded text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-foreground/50 mb-1">Vendor</label>
                                            <input
                                                type="text"
                                                value={item.vendor}
                                                onChange={(e) => updateLineItem(item.id, 'vendor', e.target.value)}
                                                placeholder="Vendor name..."
                                                className="w-full px-2 py-1.5 bg-foreground/5 border border-foreground/10 rounded text-sm"
                                            />
                                        </div>
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

                    {/* Receipts */}
                    <div className="bg-foreground/5 rounded-xl p-6 space-y-4">
                        <h2 className="font-semibold">Upload Receipts</h2>
                        <ReceiptUpload
                            onUpload={handleReceiptUpload}
                            existingReceipts={[]}
                        />
                    </div>
                </div>

                {/* Right Column - Project & Cost Center */}
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
                            <label className="block text-sm text-foreground/60 mb-1">Default Currency</label>
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

                    {/* Summary Card */}
                    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-6 border border-blue-500/30">
                        <h3 className="font-semibold mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-foreground/60">Items</span>
                                <span>{lineItems.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-foreground/60">Receipts</span>
                                <span>{receiptFiles.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-foreground/60">Payment</span>
                                <span>{getPaymentMethodLabel(paymentMethod)}</span>
                            </div>
                            <div className="border-t border-foreground/10 my-2" />
                            <div className="flex justify-between font-semibold text-lg">
                                <span>Total</span>
                                <span className="text-green-400">{currency} {totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
