"use client";

import { useState, useEffect } from "react";
import { getProjects, Project, ProjectStatus, ProjectPriority } from "@/services/projects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// =============== Icons ===============

const FolderIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const TasksIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// =============== Components ===============

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const statusColors: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
    draft: { bg: "bg-gray-500/20", text: "text-gray-400", label: "Draft" },
    active: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Active" },
    on_hold: { bg: "bg-amber-500/20", text: "text-amber-400", label: "On Hold" },
    completed: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Completed" },
    archived: { bg: "bg-gray-500/20", text: "text-gray-400", label: "Archived" },
  };

  const priorityColors: Record<ProjectPriority, string> = {
    low: "border-gray-400",
    medium: "border-blue-400",
    high: "border-orange-400",
    critical: "border-red-400",
  };

  const status = statusColors[project.status] || statusColors.draft;
  const priorityColor = priorityColors[project.priority] || "border-transparent";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Not set";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const daysRemaining = project.end_date
    ? Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue = daysRemaining !== null && daysRemaining < 0 && project.status !== "completed";

  return (
    <div
      onClick={() => onClick(project)}
      className={`group bg-background border-l-4 ${priorityColor} border border-foreground/10 rounded-xl p-5 cursor-pointer
                       hover:border-foreground/20 hover:shadow-lg hover:shadow-black/20
                       transition-all duration-200`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {project.code && (
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-foreground/10 text-foreground/60">
                {project.code}
              </span>
            )}
            <span className={`px-2 py-0.5 text-xs rounded-full ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
          <h3 className="font-semibold text-foreground group-hover:text-blue-400 transition-colors truncate">
            {project.name}
          </h3>
          {project.client && (
            <p className="text-xs text-foreground/50 mt-0.5">{project.client.name}</p>
          )}
        </div>
        {project.ai_health_score !== undefined && project.ai_health_score !== null && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${project.ai_health_score >= 70 ? "bg-emerald-500/20 text-emerald-400" :
              project.ai_health_score >= 40 ? "bg-amber-500/20 text-amber-400" :
                "bg-red-500/20 text-red-400"
            }`}>
            <ChartIcon />
            {Math.round(project.ai_health_score)}%
          </div>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-foreground/60 mb-4 line-clamp-2">{project.description}</p>
      )}

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-foreground/50">Progress</span>
          <span className="text-xs font-medium text-foreground">{project.progress_percentage}%</span>
        </div>
        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${project.progress_percentage >= 100 ? "bg-emerald-500" :
                project.progress_percentage >= 75 ? "bg-blue-500" :
                  project.progress_percentage >= 50 ? "bg-amber-500" :
                    "bg-gray-500"
              }`}
            style={{ width: `${Math.min(project.progress_percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="flex items-center gap-1 text-foreground/50">
          <TasksIcon />
          <span>{project.task_count || 0} tasks</span>
        </div>
        <div className="flex items-center gap-1 text-foreground/50">
          <UsersIcon />
          <span>{project.project_managers?.length || 0} PMs</span>
        </div>
        <div className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : "text-foreground/50"}`}>
          <CalendarIcon />
          <span>
            {daysRemaining !== null ? (
              isOverdue ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`
            ) : "No deadline"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-foreground/10">
        <div className="flex items-center gap-1 text-xs text-foreground/50">
          <CalendarIcon />
          <span>{formatDate(project.start_date)} - {formatDate(project.end_date)}</span>
        </div>
        {project.team && (
          <span className="text-xs text-foreground/50">{project.team.name}</span>
        )}
      </div>

      {/* Budget (if set) */}
      {project.budget !== undefined && project.budget !== null && (
        <div className="mt-3 pt-3 border-t border-foreground/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground/50">Budget</span>
            <span className="text-foreground">
              {project.actual_cost?.toLocaleString() || 0} / {project.budget.toLocaleString()} {project.budget_currency}
            </span>
          </div>
          <div className="mt-1 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${(project.actual_cost || 0) > project.budget ? "bg-red-500" : "bg-blue-500"
                }`}
              style={{ width: `${Math.min(((project.actual_cost || 0) / project.budget) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============== Main Component ===============

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const params = filter !== "all" ? { status: filter } : {};
        const data = await getProjects({ ...params, include_structure: false });
        setProjects(data);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        // Set mock data for demo
        setProjects([
          {
            id: "1",
            name: "Customer Portal Redesign",
            code: "CPR-2024",
            description: "Complete redesign of the customer-facing portal with modern UI and improved UX",
            status: "active",
            priority: "high",
            progress_percentage: 65,
            start_date: "2024-01-15",
            end_date: "2024-06-30",
            budget: 150000,
            budget_currency: "USD",
            actual_cost: 85000,
            task_count: 45,
            completed_task_count: 28,
            ai_health_score: 78,
            client: { id: "c1", name: "Acme Corp" },
            team: { id: "t1", name: "Frontend Team" },
            project_managers: [{ id: "pm1", user_id: "u1", project_id: "1", role: "manager", start_date: "", user: { id: "u1", full_name: "John Doe", email: "", avatar_url: "" } }],
            created_at: "",
            updated_at: "",
          } as Project,
          {
            id: "2",
            name: "Mobile App v2.0",
            code: "MOB-V2",
            description: "Major mobile app update with new features and performance improvements",
            status: "active",
            priority: "critical",
            progress_percentage: 42,
            start_date: "2024-02-01",
            end_date: "2024-08-15",
            task_count: 78,
            completed_task_count: 32,
            ai_health_score: 55,
            ai_risk_factors: ["Timeline slipping", "Resource shortage"],
            team: { id: "t2", name: "Mobile Team" },
            created_at: "",
            updated_at: "",
          } as Project,
          {
            id: "3",
            name: "API Gateway Migration",
            code: "API-MIG",
            description: "Migrate legacy API gateway to new microservices architecture",
            status: "on_hold",
            priority: "medium",
            progress_percentage: 25,
            start_date: "2024-01-01",
            end_date: "2024-04-30",
            task_count: 32,
            completed_task_count: 8,
            ai_health_score: 35,
            created_at: "",
            updated_at: "",
          } as Project,
          {
            id: "4",
            name: "Marketing Website",
            code: "MKT-WEB",
            description: "New marketing website with CMS integration",
            status: "completed",
            priority: "low",
            progress_percentage: 100,
            start_date: "2023-10-01",
            end_date: "2023-12-31",
            task_count: 24,
            completed_task_count: 24,
            ai_health_score: 100,
            client: { id: "c2", name: "Marketing Dept" },
            created_at: "",
            updated_at: "",
          } as Project,
          {
            id: "5",
            name: "Security Audit Implementation",
            code: "SEC-AUD",
            description: "Implement findings from Q4 security audit",
            status: "draft",
            priority: "high",
            progress_percentage: 0,
            task_count: 0,
            created_at: "",
            updated_at: "",
          } as Project,
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [filter]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    onTrack: projects.filter((p) => (p.ai_health_score || 0) >= 70).length,
    atRisk: projects.filter((p) => (p.ai_health_score || 100) < 50 && p.status === "active").length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-foreground/60 mt-1">Manage and track all your projects</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <PlusIcon />
            New Project
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-foreground/10 bg-background">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <FolderIcon />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-foreground/50">Total Projects</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-foreground/10 bg-background">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <FolderIcon />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                <p className="text-sm text-foreground/50">Active</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-foreground/10 bg-background">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <ChartIcon />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.onTrack}</p>
                <p className="text-sm text-foreground/50">On Track</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-foreground/10 bg-background">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.atRisk}</p>
                <p className="text-sm text-foreground/50">At Risk</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-sm px-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex bg-foreground/5 rounded-lg p-1">
            {(["all", "active", "on_hold", "completed", "draft"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${filter === status ? "bg-foreground/10 text-foreground" : "text-foreground/60 hover:text-foreground"
                  }`}
              >
                {status === "all" ? "All" : status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={(p) => {
                // TODO: Navigate to project detail
                console.log("Open project:", p.id);
              }}
            />
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-foreground/50">
            <FolderIcon />
            <p className="mt-2">No projects found</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
