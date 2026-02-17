"use client";

import TaskListPage from "@/components/TaskListPage";

export default function OverdueTasksPage() {
    return (
        <TaskListPage
            title="Overdue Tasks"
            fetchUrl="/api/tasks/my"
            fetchParams={{ status_filter: "overdue" }}
        />
    );
}
