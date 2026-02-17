"use client";

import TaskListPage from "@/components/TaskListPage";

export default function CompletedTasksPage() {
    return (
        <TaskListPage
            title="Completed Tasks"
            fetchUrl="/api/tasks/my"
            fetchParams={{ status_filter: "completed" }}
        />
    );
}
