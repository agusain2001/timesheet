'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Download, FileText, Table, Calendar,
    Filter, Loader2, CheckCircle
} from 'lucide-react';
import { exportExpenseReport, getTaxReport, type ExpenseStatus } from '@/services/expenses';

const REPORT_TYPES = [
    { id: 'expense', name: 'Expense Report', description: 'Detailed expense claims report', icon: FileText },
    { id: 'summary', name: 'Summary Report', description: 'Overview of expenses by category', icon: Table },
    { id: 'tax', name: 'Tax Report', description: 'Expenses for tax purposes', icon: Calendar },
];

const STATUS_OPTIONS: { value: ExpenseStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'approved', label: 'Approved' },
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' },
];

export default function ExpenseReportsPage() {
    const [selectedReport, setSelectedReport] = useState('expense');
    const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState<ExpenseStatus | ''>('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Tax report specific
    const [taxYear, setTaxYear] = useState(new Date().getFullYear());
    const [taxQuarter, setTaxQuarter] = useState<number | undefined>(undefined);

    const handleExport = async () => {
        try {
            setLoading(true);
            setSuccess(false);

            let blob: Blob;

            if (selectedReport === 'tax') {
                blob = await getTaxReport({
                    year: taxYear,
                    quarter: taxQuarter
                });
            } else {
                blob = await exportExpenseReport({
                    format,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined,
                    status: status || undefined
                });
            }

            // Download the file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expense-report-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to export report:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reports-page max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/my-expense"
                    className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Expense Reports</h1>
                    <p className="text-foreground/60 text-sm mt-1">
                        Generate and export expense reports
                    </p>
                </div>
            </div>

            {/* Report Type Selection */}
            <div className="bg-foreground/5 rounded-xl p-6">
                <h2 className="font-semibold mb-4">Select Report Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {REPORT_TYPES.map(report => {
                        const Icon = report.icon;
                        const isSelected = selectedReport === report.id;
                        return (
                            <button
                                key={report.id}
                                onClick={() => setSelectedReport(report.id)}
                                className={`p-4 rounded-xl text-left transition-all ${isSelected
                                        ? 'bg-blue-600/20 border-2 border-blue-500'
                                        : 'bg-background border-2 border-transparent hover:border-foreground/20'
                                    }`}
                            >
                                <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-blue-400' : 'text-foreground/60'}`} />
                                <p className="font-medium">{report.name}</p>
                                <p className="text-sm text-foreground/50 mt-1">{report.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-foreground/5 rounded-xl p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Filter className="w-5 h-5 text-purple-400" />
                    Report Filters
                </h2>

                {selectedReport === 'tax' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Year</label>
                            <select
                                value={taxYear}
                                onChange={(e) => setTaxYear(parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {[2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Quarter (Optional)</label>
                            <select
                                value={taxQuarter || ''}
                                onChange={(e) => setTaxQuarter(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Full Year</option>
                                <option value="1">Q1 (Jan-Mar)</option>
                                <option value="2">Q2 (Apr-Jun)</option>
                                <option value="3">Q3 (Jul-Sep)</option>
                                <option value="4">Q4 (Oct-Dec)</option>
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as ExpenseStatus | '')}
                                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">Format</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFormat('pdf')}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${format === 'pdf'
                                            ? 'bg-red-600/20 text-red-400 border border-red-500'
                                            : 'bg-background border border-foreground/10 hover:border-foreground/30'
                                        }`}
                                >
                                    PDF
                                </button>
                                <button
                                    onClick={() => setFormat('excel')}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${format === 'excel'
                                            ? 'bg-green-600/20 text-green-400 border border-green-500'
                                            : 'bg-background border border-foreground/10 hover:border-foreground/30'
                                        }`}
                                >
                                    Excel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Export Button */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-foreground/50">
                    {selectedReport === 'tax'
                        ? `Tax report for ${taxYear}${taxQuarter ? ` Q${taxQuarter}` : ''}`
                        : startDate && endDate
                            ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                            : 'All time'
                    }
                </div>
                <button
                    onClick={handleExport}
                    disabled={loading}
                    className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50 ${success
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating...
                        </>
                    ) : success ? (
                        <>
                            <CheckCircle className="w-5 h-5" />
                            Downloaded!
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5" />
                            Export Report
                        </>
                    )}
                </button>
            </div>

            {/* Quick Reports */}
            <div className="bg-foreground/5 rounded-xl p-6">
                <h2 className="font-semibold mb-4">Quick Reports</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => {
                            setStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
                            setEndDate(new Date().toISOString().split('T')[0]);
                        }}
                        className="p-4 bg-background rounded-lg text-left hover:bg-foreground/5 transition-colors"
                    >
                        <p className="font-medium">This Month</p>
                        <p className="text-sm text-foreground/50">Expenses from current month</p>
                    </button>
                    <button
                        onClick={() => {
                            const now = new Date();
                            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                            setStartDate(lastMonth.toISOString().split('T')[0]);
                            setEndDate(lastMonthEnd.toISOString().split('T')[0]);
                        }}
                        className="p-4 bg-background rounded-lg text-left hover:bg-foreground/5 transition-colors"
                    >
                        <p className="font-medium">Last Month</p>
                        <p className="text-sm text-foreground/50">Expenses from previous month</p>
                    </button>
                    <button
                        onClick={() => {
                            const now = new Date();
                            const quarter = Math.floor(now.getMonth() / 3);
                            const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
                            setStartDate(quarterStart.toISOString().split('T')[0]);
                            setEndDate(now.toISOString().split('T')[0]);
                        }}
                        className="p-4 bg-background rounded-lg text-left hover:bg-foreground/5 transition-colors"
                    >
                        <p className="font-medium">This Quarter</p>
                        <p className="text-sm text-foreground/50">Expenses from current quarter</p>
                    </button>
                    <button
                        onClick={() => {
                            setStartDate(`${new Date().getFullYear()}-01-01`);
                            setEndDate(new Date().toISOString().split('T')[0]);
                        }}
                        className="p-4 bg-background rounded-lg text-left hover:bg-foreground/5 transition-colors"
                    >
                        <p className="font-medium">Year to Date</p>
                        <p className="text-sm text-foreground/50">All expenses this year</p>
                    </button>
                </div>
            </div>
        </div>
    );
}
