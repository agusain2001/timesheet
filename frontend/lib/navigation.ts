import { NavItem } from "@/types/constants";
import {
    Home,
    Settings,
    Clock,
    Wallet,
    HeadsetIcon,
    GitBranch,
    Building2,
    Briefcase,
    FolderKanban,
    Users,
    Users2,
    BarChart2,
    BarChart3,
    LayoutDashboard,
    Zap,
    Search,
    Bell,
    BotMessageSquare,
    Shield,
    FileText,
    CalendarClock,
    Mail,
    KeyRound,
    Lock,
    Link2,
    UserCheck,
    Crown,
} from "lucide-react";

export const NAV_ITEMS: NavItem[] = [
    {
        name: "Home",
        href: "/home",
        icon: Home,
        pageKey: "home",
    },
    {
        name: "Operation",
        icon: GitBranch,
        pageKey: "operations",
        children: [
            { name: "Department", href: "/departments", icon: Building2 },
            { name: "Clients", href: "/clients", icon: Briefcase },
            { name: "Projects", href: "/projects", icon: FolderKanban },
            { name: "Employee", href: "/employees", icon: Users },
            { name: "Workspaces", href: "/workspaces", icon: Building2 },
            { name: "Teams", href: "/teams", icon: Users2 },
        ],
    },
    {
        name: "Dashboards",
        icon: LayoutDashboard,
        pageKey: "dashboards",
        children: [
            { name: "Manager View", href: "/dashboards/manager", icon: BarChart2 },
            { name: "Executive View", href: "/dashboards/executive", icon: Shield },
            { name: "Capacity Planning", href: "/capacity", icon: BarChart3 },
        ],
    },
    {
        name: "Reports",
        icon: BarChart2,
        pageKey: "reports",
        children: [
            { name: "Analytics", href: "/reports", icon: BarChart2 },
            { name: "Scheduled", href: "/reports/scheduled", icon: CalendarClock },
        ],
    },
    {
        name: "Templates",
        href: "/templates",
        icon: FileText,
        pageKey: "templates",
    },
    { name: "Automation", href: "/automation", icon: Zap, pageKey: "automation" },
    { name: "AI", href: "/ai", icon: BotMessageSquare, pageKey: "ai" },
    { name: "Support", href: "/support", icon: HeadsetIcon, pageKey: "support" },
    // ── Admin-only items ── visible only to admin / org_admin / system_admin
    {
        name: "Org",
        href: "/organizations",
        icon: Building2,
        roles: ["admin", "org_admin", "system_admin"],
    },
    {
        name: "Approvals",
        href: "/admin/approvals",
        icon: UserCheck,
        roles: ["admin", "org_admin", "system_admin"],
    }
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
    { name: "My Time", href: "/my-time", icon: Clock, pageKey: "my_time" },
    { name: "My Expense", href: "/my-expense", icon: Wallet, pageKey: "my_expense" },
    { name: "Settings", href: "/settings", icon: Settings, pageKey: "settings" },
];

