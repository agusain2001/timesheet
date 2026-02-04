"use client";

import { Search, Bell, LayoutGrid, Grid2x2Plus } from "lucide-react";
import { ThemeToggle } from "../ui/Toggle/ThemeToggle";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import clsx from "clsx";

export function Navbar() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null; // prevents hydration mismatch

  const isDark = theme === "dark";

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
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-semibold cursor-pointer">
          AS
        </div>
      </div>
    </header>
  );
}
