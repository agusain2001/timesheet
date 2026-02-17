"use client";

import { Search, Bell, Grid2x2Plus, LogOut, User, Settings } from "lucide-react";
import { ThemeToggle } from "../ui/Toggle/ThemeToggle";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { logout } from "@/lib/auth";

export function Navbar() {
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between px-8 py-2 transition-colors duration-200">
      <Image src="/logo.png" alt="logo" height={34} width={140} />

      <div className="relative w-96">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Image
          className="absolute right-3 top-2.5 h-4 w-4"
          src="/ai-icon.png"
          height={20}
          width={20}
          alt="ai logo"
        />
        <input
          className={clsx(
            "w-full rounded-full pl-10 pr-4 py-2 text-sm",
            isDark ? "bg-[#2A2A2A]/90" : "bg-gray-200/60",
          )}
          placeholder="Search"
        />
      </div>

      <div className="flex items-center gap-6">
        <ThemeToggle />
        <Grid2x2Plus />
        <Bell className="cursor-pointer" />

        {/* User Avatar + Dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-semibold text-white cursor-pointer hover:ring-2 hover:ring-blue-400/50 transition"
          >
            AS
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-10 z-50 w-48 bg-background border border-foreground/10 rounded-lg shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-foreground/5">
                <p className="text-sm font-medium text-foreground">Agusain</p>
                <p className="text-xs text-foreground/50 truncate">test@example.com</p>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); router.push("/home"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground transition"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={() => { setShowUserMenu(false); router.push("/settings"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground transition"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <div className="border-t border-foreground/5" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

