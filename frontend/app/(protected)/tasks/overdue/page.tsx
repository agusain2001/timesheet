"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import TaskListPage from "@/components/TaskListPage";

function formatLabel(startDate: string, endDate: string): string {
    if (startDate === endDate) {
        const d = new Date(startDate + "T00:00:00");
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return "Today";
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    const s = new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const e = new Date(endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (s === e) return s;
    return `${s} – ${e}`;
}

function OverdueTasksContent() {
    const searchParams = useSearchParams();
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const dateFilter =
        startDate && endDate
            ? { startDate, endDate, label: formatLabel(startDate, endDate) }
            : undefined;

    return (
        <TaskListPage
            title="Overdue Tasks"
            fetchUrl="/api/tasks/my"
            fetchParams={{ status_filter: "overdue" }}
            dateFilter={dateFilter}
        />
    );
}

export default function OverdueTasksPage() {
    return (
        <Suspense>
            <OverdueTasksContent />
        </Suspense>
    );
}
