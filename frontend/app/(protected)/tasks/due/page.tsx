"use client";

import TaskListPage from "@/components/TaskListPage";

export default function DueTasksPage() {
    return (
        <TaskListPage
            title="Due Tasks"
            fetchUrl="/api/tasks/my"
            fetchParams={{ active_only: "true" }}
        />
    );
}
