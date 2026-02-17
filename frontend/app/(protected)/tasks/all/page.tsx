"use client";

import TaskListPage from "@/components/TaskListPage";

export default function AllTasksPage() {
    return <TaskListPage title="My Tasks" fetchUrl="/api/tasks/my" />;
}
