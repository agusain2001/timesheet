"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { NotificationCenter } from "@/components/features/NotificationCenter";
import { CommandPalette, useCommandPalette } from "@/components/features/CommandPalette";
import { logout, getCurrentUser } from "@/lib/auth";

// =============== Icons ===============

const HomeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const KanbanIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
);

const ProjectsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const TasksIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const TeamsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const ClientsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const TimesheetIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ReportsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const SettingsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const BellIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const MenuIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

// =============== Navigation Items ===============

const ChartIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const PresentationIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
);

const GanttIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h10M4 14h14M4 18h8" />
    </svg>
);

const ListIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
);

const SwimLaneIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
);

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { name: "Kanban", href: "/kanban", icon: KanbanIcon },
    { name: "Calendar", href: "/calendar", icon: CalendarIcon },
    { name: "Timeline", href: "/timeline", icon: GanttIcon },
    { name: "List View", href: "/list", icon: ListIcon },
    { name: "Swimlane", href: "/swimlane", icon: SwimLaneIcon },
    { name: "Projects", href: "/projects", icon: ProjectsIcon },
    { name: "Tasks", href: "/tasks", icon: TasksIcon },
    { name: "Teams", href: "/teams", icon: TeamsIcon },
    { name: "Clients", href: "/clients", icon: ClientsIcon },
    { name: "Timesheet", href: "/timesheet", icon: TimesheetIcon },
    { name: "My Time", href: "/my-time", icon: TimesheetIcon },
    { name: "Expenses", href: "/my-expense", icon: ReportsIcon },
    { name: "Expense Approvals", href: "/expense-approvals", icon: TasksIcon },
    { name: "Support", href: "/support", icon: TeamsIcon },
    { name: "Reports", href: "/reports", icon: ReportsIcon },
    { name: "divider", href: "", icon: null }, // Divider
    { name: "Manager View", href: "/manager", icon: ChartIcon },
    { name: "Executive View", href: "/executive", icon: PresentationIcon },
];

const bottomNavItems = [
    { name: "Settings", href: "/settings", icon: SettingsIcon },
];

// =============== Components ===============

interface NavItemProps {
    item: { name: string; href: string; icon: React.ComponentType | null };
    isActive: boolean;
    isCollapsed: boolean;
}

function NavItem({ item, isActive, isCollapsed }: NavItemProps) {
    // Handle divider
    if (item.name === "divider") {
        return (
            <div className={`my-2 border-t border-foreground/10 ${isCollapsed ? "mx-2" : "mx-3"}`} />
        );
    }

    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/10"
                }
                ${isCollapsed ? "justify-center" : ""}
            `}
            title={isCollapsed ? item.name : undefined}
        >
            {Icon && <Icon />}
            {!isCollapsed && (
                <span className="text-sm font-medium">{item.name}</span>
            )}
        </Link>
    );
}

function UserMenu({ isCollapsed }: { isCollapsed: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<{ full_name: string; email: string } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Fetch current user on mount
    useEffect(() => {
        async function fetchUser() {
            try {
                const userData = await getCurrentUser();
                if (userData) {
                    setUser({ full_name: userData.full_name, email: userData.email });
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        }
        fetchUser();
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    // Get user initials
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const displayName = user?.full_name || 'Loading...';
    const displayEmail = user?.email || '';
    const initials = user?.full_name ? getInitials(user.full_name) : '...';

    return (
        <div className={`relative p-3 border-t border-foreground/10 ${isCollapsed ? "flex justify-center" : ""}`} ref={menuRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/10 cursor-pointer transition-colors ${isCollapsed ? "justify-center" : ""}`}
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                    {initials}
                </div>
                {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                        <p className="text-xs text-foreground/50 truncate">{displayEmail}</p>
                    </div>
                )}
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={`absolute bottom-full left-3 right-3 mb-2 bg-background border border-foreground/10 rounded-lg shadow-lg overflow-hidden z-50 ${isCollapsed ? "left-14 w-48" : ""}`}>
                    <div className="py-1">
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-sm text-left text-red-400 hover:bg-foreground/5 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const commandPalette = useCommandPalette();

    return (
        <div className="min-h-screen bg-background flex">
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 z-50 h-screen
                bg-background border-r border-foreground/10
                transition-all duration-300 ease-in-out
                ${isCollapsed ? "w-16" : "w-64"}
                ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className={`p-4 border-b border-foreground/10 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
                        {!isCollapsed && (
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                    PM
                                </div>
                                <span className="font-bold text-foreground">ProjectHub</span>
                            </Link>
                        )}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-1.5 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors hidden lg:block"
                        >
                            <div className={`transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}>
                                <ChevronLeftIcon />
                            </div>
                        </button>
                        {isCollapsed && (
                            <button
                                onClick={() => setIsCollapsed(false)}
                                className="p-1.5 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors"
                            >
                                <ChevronLeftIcon />
                            </button>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                        {navItems.map((item, index) => (
                            <NavItem
                                key={item.href || `divider-${index}`}
                                item={item}
                                isActive={pathname === item.href}
                                isCollapsed={isCollapsed}
                            />
                        ))}
                    </nav>

                    {/* Bottom Navigation */}
                    <div className="p-3 border-t border-foreground/10 space-y-1">
                        {bottomNavItems.map((item) => (
                            <NavItem
                                key={item.href}
                                item={item}
                                isActive={pathname === item.href}
                                isCollapsed={isCollapsed}
                            />
                        ))}
                    </div>

                    {/* User */}
                    <UserMenu isCollapsed={isCollapsed} />
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-foreground/10">
                    <div className="flex items-center justify-between px-4 h-16">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="p-2 rounded-lg hover:bg-foreground/10 text-foreground lg:hidden"
                        >
                            <MenuIcon />
                        </button>

                        {/* Search */}
                        <div className="flex-1 max-w-xl mx-4 hidden md:block">
                            <button
                                onClick={commandPalette.open}
                                className="w-full relative text-left"
                            >
                                <div className="w-full pl-10 pr-4 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-foreground/40 hover:bg-foreground/10 transition-colors cursor-pointer">
                                    Search tasks, projects, or press ⌘K...
                                </div>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">
                                    <SearchIcon />
                                </div>
                                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs bg-foreground/10 rounded text-foreground/40 hidden sm:block">
                                    ⌘K
                                </kbd>
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <NotificationCenter />
                            <button
                                onClick={commandPalette.open}
                                className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors md:hidden"
                            >
                                <SearchIcon />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-6 overflow-auto">
                    {children}
                </main>
            </div>

            {/* Command Palette */}
            <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
        </div>
    );
}
