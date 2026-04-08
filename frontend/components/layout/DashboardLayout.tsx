"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { logout, getCurrentUser } from "@/lib/auth";

// =============== Icons ===============

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

const ChevronDownIcon = ({ open }: { open: boolean }) => (
    <svg
        className={`w-4 h-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

// =============== SVG Icon Components ===============

const HomeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const TaskIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const TimesheetIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ExpenseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const OperationIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const DepartmentIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const ClientIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const ProjectIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const EmployeeIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const SupportIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const SettingsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

// =============== Navigation Data ===============

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { name: "My Time", href: "/my-time", icon: TimesheetIcon },
    { name: "My Tasks", href: "/my-tasks", icon: TaskIcon },
    { name: "My Expense", href: "/my-expense", icon: ExpenseIcon },
];

const operationSubItems = [
    { name: "Department", href: "/departments", icon: DepartmentIcon },
    { name: "Clients", href: "/clients", icon: ClientIcon },
    { name: "Projects", href: "/projects", icon: ProjectIcon },
    { name: "Employee", href: "/employees", icon: EmployeeIcon },
];

const bottomNavItems = [
    { name: "Support", href: "/support", icon: SupportIcon },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
];

// =============== Components ===============

function NavItem({
    item,
    isActive,
    isCollapsed,
}: {
    item: { name: string; href: string; icon: React.ComponentType };
    isActive: boolean;
    isCollapsed: boolean;
}) {
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
            <Icon />
            {!isCollapsed && (
                <span className="text-sm font-medium">{item.name}</span>
            )}
        </Link>
    );
}

function OperationNavItem({
    isCollapsed,
    pathname,
}: {
    isCollapsed: boolean;
    pathname: string;
}) {
    const isAnySubActive = operationSubItems.some((sub) => pathname === sub.href);
    const [isOpen, setIsOpen] = useState(isAnySubActive);

    // Measure height for smooth animation
    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState(0);

    useEffect(() => {
        if (contentRef.current) {
            setContentHeight(contentRef.current.scrollHeight);
        }
    }, []);

    // Collapse when sidebar collapses
    useEffect(() => {
        if (isCollapsed) setIsOpen(false);
    }, [isCollapsed]);

    return (
        <div>
            {/* Operation trigger button */}
            <button
                onClick={() => !isCollapsed && setIsOpen((prev) => !prev)}
                title={isCollapsed ? "Operation" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${isAnySubActive
                        ? "bg-blue-600/10 text-blue-400"
                        : "text-foreground/60 hover:text-foreground hover:bg-foreground/10"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                `}
            >
                <OperationIcon />
                {!isCollapsed && (
                    <>
                        <span className="text-sm font-medium flex-1 text-left">Operation</span>
                        <ChevronDownIcon open={isOpen} />
                    </>
                )}
            </button>

            {/* Accordion sub-menu */}
            {!isCollapsed && (
                <div
                    style={{
                        maxHeight: isOpen ? `${contentHeight}px` : "0px",
                        overflow: "hidden",
                        transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                >
                    <div ref={contentRef} className="mt-1 ml-3 pl-3 border-l border-foreground/10 space-y-0.5">
                        {operationSubItems.map((sub) => {
                            const SubIcon = sub.icon;
                            const isActive = pathname === sub.href;
                            return (
                                <Link
                                    key={sub.href}
                                    href={sub.href}
                                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150
                                        ${isActive
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                                            : "text-foreground/50 hover:text-foreground hover:bg-foreground/10"
                                        }
                                    `}
                                >
                                    <SubIcon />
                                    <span className="font-medium">{sub.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function UserMenu({ isCollapsed }: { isCollapsed: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<{ full_name: string; email: string } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

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
                            <Link href="/" className="flex items-center gap-2">
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
                        {navItems.map((item) => (
                            <NavItem
                                key={item.href}
                                item={item}
                                isActive={pathname === item.href}
                                isCollapsed={isCollapsed}
                            />
                        ))}

                        {/* Divider before Operation */}
                        <div className={`my-2 border-t border-foreground/10 ${isCollapsed ? "mx-2" : "mx-0"}`} />

                        {/* Operation accordion item */}
                        <OperationNavItem isCollapsed={isCollapsed} pathname={pathname} />
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

                        <div className="flex-1" />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
