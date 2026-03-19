"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { BOTTOM_NAV_ITEMS, NAV_ITEMS } from "@/lib/navigation";
import { NavItem } from "@/types/constants";
import { getCurrentUser } from "@/services/users";
import { User } from "@/types/api";
import { Crown, ChevronRight } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedOrgName, setSelectedOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelectedOrgName(localStorage.getItem("superadmin_selected_org_name") || null);
    }
  }, []);

  useEffect(() => setMounted(true), []);

  // Fetch current user (with accessible_pages) once on mount
  useEffect(() => {
    getCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  // Auto-expand any nav group whose child route matches the current path
  useEffect(() => {
    const NAV_ITEMS_ALL = [...NAV_ITEMS];
    for (const item of NAV_ITEMS_ALL) {
      if (item.children?.some(child => child.href && pathname.startsWith(child.href))) {
        setOpenItem(item.name);
        break;
      }
    }
  }, [pathname]);

  if (!mounted) return null; // prevents theme flicker

  const isDark = theme === "dark";

  /**
   * Determine whether a nav item should be visible for the current user.
   *
   * Rules:
   *  - Admins & managers see everything.
   *  - Employees see only items whose pageKey is in their accessible_pages list.
   *  - Items without a pageKey are always shown (no restriction needed).
   */
  const isVisible = (item: NavItem): boolean => {
    if (!currentUser) return true; // still loading → show all

    const role = currentUser.role;

    // If item has an explicit role allowlist, ONLY those roles can see it
    // (this is the primary gate; everyone — even admins — must be in the list)
    if (item.roles && item.roles.length > 0) {
      return item.roles.includes(role);
    }

    // No role restriction on the item: admins/managers see it, employees check accessible_pages
    if (
      role === "admin" ||
      role === "org_admin" ||
      role === "system_admin" ||
      role === "manager"
    ) return true;

    if (!item.pageKey) return true;
    if (!currentUser.accessible_pages) return true;
    return currentUser.accessible_pages.includes(item.pageKey);
  };

  const renderNavItem = (item: NavItem) => {
    if (!isVisible(item)) return null; // hide restricted items

    const Icon = item.icon;
    const hasChildren = !!item.children?.length;
    const isOpen = openItem === item.name;

    // Check if parent or any child is active
    const parentActive = item.href && pathname.startsWith(item.href);
    const childActive = item.children?.some(
      (child) => child.href && pathname.startsWith(child.href),
    );
    const isActive = parentActive || childActive;

    const baseClasses = clsx(
      "flex flex-col items-center justify-center rounded-lg text-xs cursor-pointer transition-transform duration-200",
      "hover:scale-110",
    );

    return (
      <div
        key={item.name}
        className={clsx("flex flex-col items-center w-full rounded-md")}
        onMouseEnter={() => setHoveredItem(item.name)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        {/* Parent */}
        {hasChildren ? (
          <button
            onClick={() => setOpenItem(isOpen ? null : item.name)}
            className={clsx(
              baseClasses,
              isActive && "text-blue-400",
              isOpen && "border-b rounded-none border-foreground/10 pt-2 pb-4",
              hoveredItem === item.name && "scale-110",
            )}
          >
            <Icon size={20} />
            <span className="text-[12px] text-center leading-tight mt-1">
              {item.name}
            </span>
          </button>
        ) : (
          <Link
            href={item.href!}
            prefetch={false}
            className={clsx(
              baseClasses,
              isActive && "text-blue-400",
              hoveredItem === item.name && "scale-110",
            )}
          >
            <Icon size={20} />
            <span className="text-[12px] text-center leading-tight mt-1">
              {item.name}
            </span>
          </Link>
        )}

        {/* Children */}
        {hasChildren && (
          <div
            className={clsx(
              "flex flex-col items-center gap-4 transition-all duration-500 ease-in-out overflow-hidden w-full",
              isOpen ? "max-h-[800px] opacity-100 mt-3 pb-2" : "max-h-0 opacity-0",
            )}
          >
            {item.children!.filter(isVisible).map((child) => {
              const ChildIcon = child.icon;
              const childIsActive =
                child.href && pathname.startsWith(child.href);
              const isHovered =
                hoveredItem === `${item.name}-${child.name}`;

              return (
                <Link
                  key={child.name}
                  href={child.href!}
                  prefetch={false}
                  className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-lg transition text-xs",
                    "hover:scale-110",
                    childIsActive && "text-blue-400",
                    isHovered && "scale-110",
                  )}
                  onMouseEnter={() =>
                    setHoveredItem(`${item.name}-${child.name}`)
                  }
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <ChildIcon size={18} />
                  <span className="mt-1 text-[12px] text-center leading-tight">
                    {child.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={clsx(
        "font-poppins w-20 h-full overflow-y-auto no-scrollbar text-gray-foreground border border-foreground/10 rounded-md flex flex-col px-2 py-6",
        isDark ? "bg-[#191919]/90" : "bg-gray-200/70",
      )}
    >
      {/* Super Admin org-switcher banner */}
      {currentUser?.role === "system_admin" && (
        <button
          onClick={() => router.push("/super-admin")}
          title="Switch Organisation"
          className="w-full mb-4 flex flex-col items-center gap-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all group"
        >
          <Crown size={16} className="text-amber-400" />
          <span className="text-[9px] text-amber-400/80 text-center leading-tight font-medium truncate max-w-full">
            {selectedOrgName ? selectedOrgName.slice(0, 8) : "All Orgs"}
          </span>
          <ChevronRight size={10} className="text-amber-400/50 group-hover:text-amber-400" />
        </button>
      )}

      {/* Top Section */}
      <nav className="flex flex-col gap-6 w-full items-center">
        {NAV_ITEMS.map(renderNavItem)}
      </nav>

      {/* Push bottom items down */}
      <div className="mt-auto pt-6 flex flex-col gap-6 items-center w-full transition duration-100">
        {BOTTOM_NAV_ITEMS.map(renderNavItem)}
      </div>
    </aside>
  );
}
