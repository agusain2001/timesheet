"use client";

/**
 * DateFilterDropdown
 * A dropdown that lets the user pick Today / This Week / This Month or a Custom Date range.
 * The custom picker is a self-contained mini-calendar with no external dependencies.
 * Works in both light and dark themes via Tailwind + CSS variables.
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateRange {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
}

export type FilterPreset = "today" | "this_week" | "this_month" | "custom";

export interface DateFilterDropdownProps {
    onFilterChange: (range: DateRange, preset: FilterPreset) => void;
    initialPreset?: FilterPreset;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date): string {
    return d.toISOString().split("T")[0];
}

function getTodayRange(): DateRange {
    const t = toISO(new Date());
    return { startDate: t, endDate: t };
}

function getThisWeekRange(): DateRange {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { startDate: toISO(monday), endDate: toISO(sunday) };
}

function getThisMonthRange(): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: toISO(start), endDate: toISO(end) };
}

function getPresetRange(preset: FilterPreset, custom?: DateRange): DateRange {
    if (preset === "today") return getTodayRange();
    if (preset === "this_week") return getThisWeekRange();
    if (preset === "this_month") return getThisMonthRange();
    return custom ?? getThisMonthRange();
}

function formatLabel(preset: FilterPreset, custom?: DateRange): string {
    if (preset === "today") return "Today";
    if (preset === "this_week") return "This Week";
    if (preset === "this_month") return "This Month";
    if (custom) {
        const { startDate, endDate } = custom;
        if (startDate === endDate) {
            // e.g. "Mar 18"
            return new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
        const s = new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const e = new Date(endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `${s} – ${e}`;
    }
    return "Custom Date";
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

interface MiniCalendarProps {
    onApply: (range: DateRange) => void;
    onCancel: () => void;
    initial?: DateRange;
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function MiniCalendar({ onApply, onCancel, initial }: MiniCalendarProps) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    // Selection state
    const [selecting, setSelecting] = useState<"start" | "end">("start");
    const [startDay, setStartDay] = useState<Date | null>(
        initial?.startDate ? new Date(initial.startDate + "T00:00:00") : null
    );
    const [endDay, setEndDay] = useState<Date | null>(
        initial?.endDate ? new Date(initial.endDate + "T00:00:00") : null
    );
    const [hoverDay, setHoverDay] = useState<Date | null>(null);

    // Build cells for current month view
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    // weekday of first cell (Mon=0 ... Sun=6)
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: Array<Date | null> = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

    // Pad to full weeks
    while (cells.length % 7 !== 0) cells.push(null);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
        else setViewMonth(m => m + 1);
    };

    const handleDayClick = (d: Date) => {
        if (selecting === "start") {
            setStartDay(d);
            setEndDay(null);
            setSelecting("end");
        } else {
            if (startDay && d < startDay) {
                // clicked before start → swap
                setEndDay(startDay);
                setStartDay(d);
            } else {
                setEndDay(d);
            }
            setSelecting("start");
        }
    };

    const isInRange = (d: Date): boolean => {
        const ref = hoverDay && selecting === "end" ? hoverDay : endDay;
        if (!startDay || !ref) return false;
        const lo = startDay <= ref ? startDay : ref;
        const hi = startDay <= ref ? ref : startDay;
        return d > lo && d < hi;
    };

    const isStart = (d: Date) => startDay && d.getTime() === startDay.getTime();
    const isEnd = (d: Date) => {
        const ref = hoverDay && selecting === "end" ? hoverDay : endDay;
        return ref && d.getTime() === ref.getTime();
    };
    const isToday = (d: Date) => d.toDateString() === today.toDateString();

    const handleApply = () => {
        if (!startDay) return;
        const end = endDay ?? startDay;
        const lo = startDay <= end ? startDay : end;
        const hi = startDay <= end ? end : startDay;
        onApply({ startDate: toISO(lo), endDate: toISO(hi) });
    };

    const canApply = !!startDay;

    return (
        <div
            className="select-none rounded-xl shadow-xl border border-foreground/10 bg-background p-4 w-72"
            style={{ backdropFilter: "blur(12px)" }}
        >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
                <button
                    onClick={prevMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <span className="text-sm font-semibold text-foreground">
                    {MONTHS[viewMonth]} {viewYear}
                </span>
                <button
                    onClick={nextMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                    <span key={d} className="text-center text-[10px] font-medium text-foreground/40 py-1">
                        {d}
                    </span>
                ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((d, i) => {
                    if (!d) return <div key={`empty-${i}`} />;

                    const start = isStart(d);
                    const end = isEnd(d);
                    const inRange = isInRange(d);
                    const todayCell = isToday(d);
                    const isSelected = start || end;

                    return (
                        <div
                            key={d.toDateString()}
                            onClick={() => handleDayClick(d)}
                            onMouseEnter={() => setHoverDay(d)}
                            onMouseLeave={() => setHoverDay(null)}
                            className={[
                                "relative flex items-center justify-center h-8 cursor-pointer text-[13px] transition-colors duration-100",
                                inRange ? "bg-blue-500/15" : "",
                                start ? "rounded-l-full" : "",
                                end ? "rounded-r-full" : "",
                                !start && !end && !inRange ? "rounded-full" : "",
                            ].join(" ")}
                        >
                            <span
                                className={[
                                    "w-7 h-7 flex items-center justify-center rounded-full transition-colors duration-100 font-medium",
                                    isSelected
                                        ? "bg-blue-600 text-white"
                                        : todayCell
                                            ? "border border-blue-500 text-blue-500"
                                            : "text-foreground/80 hover:bg-foreground/10",
                                ].join(" ")}
                            >
                                {d.getDate()}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Hint */}
            <p className="text-[11px] text-foreground/40 text-center mt-2">
                {selecting === "start" ? "Click a day to select start date" : "Click a day to select end date (or same day for single)"}
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
                <button
                    onClick={onCancel}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-foreground/15 text-foreground/60 hover:bg-foreground/5 transition"
                >
                    Cancel
                </button>
                <button
                    onClick={handleApply}
                    disabled={!canApply}
                    className={[
                        "flex-1 py-1.5 rounded-lg text-xs font-semibold transition",
                        canApply
                            ? "bg-blue-600 text-white hover:bg-blue-500"
                            : "bg-blue-600/30 text-blue-400/50 cursor-not-allowed",
                    ].join(" ")}
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

// ─── Main Dropdown ─────────────────────────────────────────────────────────────

export default function DateFilterDropdown({ onFilterChange, initialPreset = "this_month" }: DateFilterDropdownProps) {
    const [preset, setPreset] = useState<FilterPreset>(initialPreset);
    const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
    const [open, setOpen] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setShowCalendar(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const applyPreset = useCallback((p: FilterPreset) => {
        setPreset(p);
        const range = getPresetRange(p, customRange);
        onFilterChange(range, p);
        setOpen(false);
        setShowCalendar(false);
    }, [customRange, onFilterChange]);

    const applyCustom = useCallback((range: DateRange) => {
        setCustomRange(range);
        setPreset("custom");
        onFilterChange(range, "custom");
        setShowCalendar(false);
        setOpen(false);
    }, [onFilterChange]);

    const label = formatLabel(preset, customRange);

    const menuOptions: { key: FilterPreset; label: string }[] = [
        { key: "today", label: "Today" },
        { key: "this_week", label: "This Week" },
        { key: "this_month", label: "This Month" },
    ];

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <button
                onClick={() => { setOpen(o => !o); setShowCalendar(false); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98] transition-all shadow-sm shadow-blue-600/30"
            >
                {label}
                <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown panel */}
            {open && !showCalendar && (
                <div
                    className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl border border-foreground/10 bg-background overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{ backdropFilter: "blur(16px)" }}
                >
                    <div className="py-1.5">
                        {menuOptions.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => applyPreset(opt.key)}
                                className={[
                                    "w-full text-left px-4 py-3 text-[15px] font-medium transition-colors",
                                    preset === opt.key
                                        ? "bg-foreground/8 text-foreground"
                                        : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
                                ].join(" ")}
                            >
                                {opt.label}
                            </button>
                        ))}

                        {/* Divider */}
                        <div className="my-1 border-t border-foreground/10" />

                        {/* Custom Date */}
                        <button
                            onClick={() => setShowCalendar(true)}
                            className={[
                                "w-full text-left px-4 py-3 flex items-center justify-between text-[15px] font-medium transition-colors",
                                preset === "custom"
                                    ? "text-blue-500"
                                    : "text-blue-500 hover:bg-blue-500/5",
                            ].join(" ")}
                        >
                            <span>Custom Date</span>
                            <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Calendar panel (replaces dropdown) */}
            {open && showCalendar && (
                <div className="absolute right-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <MiniCalendar
                        initial={customRange}
                        onApply={applyCustom}
                        onCancel={() => { setShowCalendar(false); setOpen(false); }}
                    />
                </div>
            )}
        </div>
    );
}
