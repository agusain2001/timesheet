"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { BOTTOM_NAV_ITEMS, NAV_ITEMS } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null; // prevents theme flicker

  const isDark = theme === "dark";

  return (
    <aside
      className={clsx(
        "font-poppins w-20 h-[calc(100%-1rem)] overflow-y-auto no-scrollbar text-gray-foreground border border-white/10 rounded-md flex flex-col px-2 py-6",
        isDark ? "bg-[#191919]/90" : "bg-gray-200/70",
      )}
    >
      {/* Top Section */}
      <nav className="flex flex-col gap-6 w-full items-center">
        {NAV_ITEMS.map((item) => {
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
                    isOpen && "border-b rounded-none border-white/10 pt-2 pb-4",
                    hoveredItem === item.name && "scale-110",
                  )}
                >
                  <Icon size={20} />
                  <span className="text-[12px] text-center leading-tight">
                    {item.name}
                  </span>
                </button>
              ) : (
                <Link
                  href={item.href!}
                  className={clsx(
                    baseClasses,
                    isActive && "text-blue-400",
                    hoveredItem === item.name && "scale-110",
                  )}
                >
                  <Icon size={20} />
                  <span className="text-[12px] text-center leading-tight">
                    {item.name}
                  </span>
                </Link>
              )}

              {/* Children */}
              {hasChildren && (
                <div
                  className={clsx(
                    "flex flex-col items-center gap-4 transition-all duration-500 ease-in-out overflow-hidden w-full",
                    isOpen ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0",
                  )}
                >
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const childIsActive =
                      child.href && pathname.startsWith(child.href);
                    const isHovered =
                      hoveredItem === `${item.name}-${child.name}`;

                    return (
                      <Link
                        key={child.name}
                        href={child.href!}
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
        })}
      </nav>

      {/* Push bottom items down */}
      <div className="mt-auto pt-6 flex flex-col gap-6 items-center transition duration-100">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.href && pathname.startsWith(item.href);
          const isHovered = hoveredItem === item.name;

          return (
            <Link
              key={item.name}
              href={item.href!}
              className={clsx(
                "flex flex-col items-center justify-center text-xs transition-transform duration-200",
                "hover:scale-110",
                active && "text-blue-400",
                isHovered && "scale-110",
              )}
              onMouseEnter={() => setHoveredItem(item.name)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Icon size={20} />
              <span className="mt-1 text-[12px] text-center leading-tight">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
