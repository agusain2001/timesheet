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

// =============== Navigation Items ===============

const navItems: { name: string; href: string; icon: React.ComponentType | null }[] = [];

const bottomNavItems: { name: string; href: string; icon: React.ComponentType | null }[] = [];

// =============== Components ===============

interface NavItemProps {
    item: { name: string; href: string; icon: React.ComponentType | null };
    isActive: boolean;
    isCollapsed: boolean;
}

function NavItem({ item, isActive, isCollapsed }: NavItemProps) {
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
