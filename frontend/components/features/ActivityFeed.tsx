"use client";

// =============== Types ===============

export type ActivityType =
    | "task_created"
    | "task_updated"
    | "task_completed"
    | "task_assigned"
    | "comment_added"
    | "file_uploaded"
    | "project_created"
    | "status_changed"
    | "member_joined"
    | "timer_started"
    | "timer_stopped";

export interface ActivityItem {
    id: string;
    type: ActivityType;
    actor: {
        id: string;
        name: string;
        avatar?: string;
    };
    target?: {
        type: "task" | "project" | "team" | "comment";
        id: string;
        name: string;
    };
    metadata?: Record<string, unknown>;
    timestamp: string;
}

interface ActivityFeedProps {
    activities: ActivityItem[];
    maxItems?: number;
    showLoadMore?: boolean;
    onLoadMore?: () => void;
    loading?: boolean;
}

// =============== Icons ===============

const TaskIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const UserIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const CommentIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const FileIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
);

const ProjectIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const StatusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

// =============== Helper Functions ===============

const getActivityIcon = (type: ActivityType) => {
    switch (type) {
        case "task_created":
            return <TaskIcon />;
        case "task_updated":
            return <EditIcon />;
        case "task_completed":
            return <CheckIcon />;
        case "task_assigned":
            return <UserIcon />;
        case "comment_added":
            return <CommentIcon />;
        case "file_uploaded":
            return <FileIcon />;
        case "project_created":
            return <ProjectIcon />;
        case "status_changed":
            return <StatusIcon />;
        case "member_joined":
            return <UserIcon />;
        case "timer_started":
        case "timer_stopped":
            return <ClockIcon />;
        default:
            return <TaskIcon />;
    }
};

const getActivityColor = (type: ActivityType) => {
    switch (type) {
        case "task_created":
        case "project_created":
            return "bg-blue-500";
        case "task_completed":
            return "bg-emerald-500";
        case "task_updated":
        case "status_changed":
            return "bg-amber-500";
        case "task_assigned":
        case "member_joined":
            return "bg-purple-500";
        case "comment_added":
            return "bg-pink-500";
        case "file_uploaded":
            return "bg-cyan-500";
        case "timer_started":
            return "bg-green-500";
        case "timer_stopped":
            return "bg-red-500";
        default:
            return "bg-gray-500";
    }
};

const getActivityMessage = (activity: ActivityItem): React.ReactNode => {
    const actorName = <span className="font-medium text-foreground">{activity.actor.name}</span>;
    const targetName = activity.target ? (
        <span className="font-medium text-blue-400">{activity.target.name}</span>
    ) : null;

    switch (activity.type) {
        case "task_created":
            return <>{actorName} created task {targetName}</>;
        case "task_updated":
            return <>{actorName} updated task {targetName}</>;
        case "task_completed":
            return <>{actorName} completed task {targetName}</>;
        case "task_assigned":
            return <>{actorName} was assigned to {targetName}</>;
        case "comment_added":
            return <>{actorName} commented on {targetName}</>;
        case "file_uploaded":
            return <>{actorName} uploaded a file to {targetName}</>;
        case "project_created":
            return <>{actorName} created project {targetName}</>;
        case "status_changed":
            const newStatus = activity.metadata?.newStatus as string;
            return <>{actorName} changed status of {targetName} to <span className="text-amber-400">{newStatus}</span></>;
        case "member_joined":
            return <>{actorName} joined team {targetName}</>;
        case "timer_started":
            return <>{actorName} started timer on {targetName}</>;
        case "timer_stopped":
            return <>{actorName} stopped timer on {targetName}</>;
        default:
            return <>{actorName} performed an action</>;
    }
};

const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

// =============== Activity Item Component ===============

interface ActivityItemComponentProps {
    activity: ActivityItem;
    isLast: boolean;
}

function ActivityItemComponent({ activity, isLast }: ActivityItemComponentProps) {
    const commentPreview = activity.type === "comment_added" && activity.metadata?.preview
        ? String(activity.metadata.preview)
        : null;

    return (
        <div className="flex gap-3 group">
            {/* Timeline */}
            <div className="flex flex-col items-center">
                <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${getActivityColor(
                        activity.type
                    )}`}
                >
                    {getActivityIcon(activity.type)}
                </div>
                {!isLast && (
                    <div className="w-0.5 flex-1 bg-foreground/10 mt-2" />
                )}
            </div>

            {/* Content */}
            <div className={`flex-1 pb-6 ${isLast ? "" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-foreground/70">
                        {getActivityMessage(activity)}
                    </p>
                    <span className="text-xs text-foreground/40 whitespace-nowrap">
                        {timeAgo(activity.timestamp)}
                    </span>
                </div>

                {/* Preview for comments */}
                {commentPreview && (
                    <div className="mt-2 p-3 bg-foreground/5 rounded-lg text-sm text-foreground/60 border-l-2 border-foreground/20">
                        {commentPreview}
                    </div>
                )}
            </div>
        </div>
    );
}

// =============== Main Component ===============

export function ActivityFeed({
    activities,
    maxItems,
    showLoadMore = false,
    onLoadMore,
    loading = false,
}: ActivityFeedProps) {
    const displayedActivities = maxItems ? activities.slice(0, maxItems) : activities;

    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-foreground/40">
                <ClockIcon />
                <p className="mt-2 text-sm">No activity yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-0">
            {displayedActivities.map((activity, index) => (
                <ActivityItemComponent
                    key={activity.id}
                    activity={activity}
                    isLast={index === displayedActivities.length - 1}
                />
            ))}

            {showLoadMore && activities.length > (maxItems || 0) && (
                <button
                    onClick={onLoadMore}
                    disabled={loading}
                    className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                    {loading ? "Loading..." : "Load more activity"}
                </button>
            )}
        </div>
    );
}

// =============== Generate Mock Activities ===============

export function generateMockActivities(count: number = 10): ActivityItem[] {
    const types: ActivityType[] = [
        "task_created",
        "task_updated",
        "task_completed",
        "task_assigned",
        "comment_added",
        "status_changed",
    ];

    const actors = [
        { id: "u1", name: "John Doe" },
        { id: "u2", name: "Jane Smith" },
        { id: "u3", name: "Bob Wilson" },
        { id: "u4", name: "Alice Brown" },
    ];

    const targets = [
        { type: "task" as const, id: "t1", name: "Implement login page" },
        { type: "task" as const, id: "t2", name: "Design dashboard" },
        { type: "project" as const, id: "p1", name: "Website Redesign" },
        { type: "task" as const, id: "t3", name: "API Integration" },
    ];

    return Array.from({ length: count }, (_, i) => ({
        id: `activity-${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        actor: actors[Math.floor(Math.random() * actors.length)],
        target: targets[Math.floor(Math.random() * targets.length)],
        metadata: {
            newStatus: ["In Progress", "Review", "Completed"][Math.floor(Math.random() * 3)],
            preview: i % 3 === 0 ? "This looks great! I'll review it tomorrow morning." : undefined,
        },
        timestamp: new Date(Date.now() - i * 3600000 * Math.random() * 5).toISOString(),
    }));
}

export default ActivityFeed;
