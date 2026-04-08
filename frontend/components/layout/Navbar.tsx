"use client";

import { Search, Bell, Grid2x2Plus, LogOut, User, Settings } from "lucide-react";
import { ThemeToggle } from "../ui/Toggle/ThemeToggle";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { logout, getToken } from "@/lib/auth";
import { getProjects } from "@/services/projects";
import { getNotifications, getUnreadCount } from "@/services/notifications";
import NotificationsPanel from "@/components/NotificationsPanel";

import AddTaskModal from "@/components/AddTaskModal";
import NewExpenseModal from "@/components/NewExpenseModal";
import { AddClientModal } from "@/components/ClientModals";
import { AddProjectModal } from "@/components/ProjectModals";
import { AddRequestModal } from "@/components/SupportModals";

export function Navbar() {
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false); // New state for NotificationsPanel
  const [notifications, setNotifications] = useState<any[]>([]);
  const [modal, setModal] = useState<"task" | "client" | "project" | "expense" | "support" | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => setMounted(true), []);

  // Fetch unread notification count
  useEffect(() => {
    if (!mounted) return;
    const fetchUnread = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data?.unread_count ?? 0);
        }
      } catch { }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [mounted, API]);

  const fetchProjectsForExpense = async () => {
    try {
      const data = await getProjects();
      setProjects(data.map(p => ({ id: p.id, name: p.name })));
    } catch (e) { }
  };

  const fetchNotifications = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API}/api/notifications?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
      }
    } catch { }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // existing refs...
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) setShowQuickAdd(false);
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) setShowNotifications(false);
      // search ref
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const token = getToken();
      // Use the frontend API route which acts as proxy
      const [res, sugRes] = await Promise.all([
        fetch(`${API}/api/search?q=${encodeURIComponent(q)}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/search/suggestions?q=${encodeURIComponent(q)}&limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      } else {
        setSearchResults([]);
      }

      if (sugRes.ok) {
        const sugData = await sugRes.json();
        setSuggestions(sugData.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSearchResults([]);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [API]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchQuery.trim()) {
      searchTimerRef.current = setTimeout(() => runSearch(searchQuery), 350);
      setShowSearchDropdown(true);
    } else {
      setSearchResults([]);
      setSuggestions([]);
      setShowSearchDropdown(false);
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery, runSearch]);

  const handleSearchResultClick = (result: any) => {
    setShowSearchDropdown(false);
    setSearchQuery("");

    if (result.url) { router.push(result.url); }
    else if (result.type === "task") { router.push(`/tasks?id=${result.id}`); }
    else if (result.type === "project") { router.push(`/projects?id=${result.id}`); }
    else if (result.type === "user") { router.push(`/employees?id=${result.id}`); }
  };

  const TYPE_BADGE_MAP: Record<string, string> = {
    task: "bg-blue-500/20 text-blue-400",
    project: "bg-blue-500/20 text-blue-400",
    user: "bg-purple-500/20 text-purple-400",
    comment: "bg-slate-500/20 text-foreground/60",
    client: "bg-green-500/20 text-green-400",
    team: "bg-amber-500/20 text-amber-400",
  };

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

      <div ref={searchRef} className="relative w-96">
        <form onSubmit={(e) => e.preventDefault()} className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground/40 pointer-events-none" />
          <Image
            className="absolute right-3 top-2.5 h-4 w-4"
            src="/ai-icon.png"
            height={20}
            width={20}
            alt="ai logo"
          />
          <input
            className={clsx(
              "w-full rounded-full pl-10 pr-4 py-2 text-sm text-foreground placeholder-foreground/40 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/50",
              isDark ? "bg-[#2A2A2A]/90" : "bg-gray-200/60",
            )}
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchQuery.trim()) setShowSearchDropdown(true); }}
          />
        </form>

        {/* Global Search Dropdown */}
        {showSearchDropdown && (
          <div className="absolute top-12 left-0 w-full bg-background border border-foreground/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[400px]">
            {isSearching ? (
              <div className="p-4 text-center text-sm text-foreground/50">
                Searching...
              </div>
            ) : searchResults.length > 0 || suggestions.length > 0 ? (
              <div className="overflow-y-auto overscroll-contain px-2 py-2 space-y-1">
                {/* Suggestions Section */}
                {suggestions.length > 0 && (
                  <div className="mb-2">
                    {suggestions.map((sug, idx) => (
                      <button
                        key={`sug-${idx}`}
                        onClick={() => {
                          setSearchQuery(sug.text);
                          runSearch(sug.text);
                        }}
                        className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/[0.05] transition-colors group"
                      >
                        <Search className="h-4 w-4 text-foreground/40 shrink-0" />
                        <span className="text-sm font-medium text-foreground group-hover:text-blue-400 transition-colors truncate">
                          {sug.text}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {suggestions.length > 0 && searchResults.length > 0 && (
                  <div className="h-px bg-foreground/10 mx-2 my-2" />
                )}

                {/* Rich Results Section */}
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-foreground/[0.05] transition-colors group"
                  >
                    <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${TYPE_BADGE_MAP[result.type] || "bg-foreground/10 text-foreground/50"}`}>
                      {result.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-blue-400 transition-colors truncate">
                        {result.title}
                      </p>
                      {result.subtitle ? (
                        <p className="text-xs text-foreground/50 mt-0.5 line-clamp-1">{result.subtitle}</p>
                      ) : result.description ? (
                        <p className="text-xs text-foreground/50 mt-0.5 line-clamp-1">{result.description}</p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-foreground/50">
                Search not found
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <ThemeToggle />

        {/* Quick Add Menu */}
        <div ref={quickAddRef} className="relative">
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="text-foreground/70 hover:text-foreground transition flex items-center"
          >
            <Grid2x2Plus className="w-5 h-5 cursor-pointer" />
          </button>

          {showQuickAdd && (
            <div className="absolute right-0 top-10 z-50 w-48 bg-background border border-foreground/10 rounded-lg shadow-2xl overflow-hidden py-1">
              <button onClick={() => { setShowQuickAdd(false); setModal("task"); }} className="w-full text-left px-4 py-2 hover:bg-foreground/5 text-sm text-foreground/80 transition">
                New Task
              </button>
              <button onClick={() => { setShowQuickAdd(false); setModal("client"); }} className="w-full text-left px-4 py-2 hover:bg-foreground/5 text-sm text-foreground/80 transition">
                New Client
              </button>
              <button onClick={() => { setShowQuickAdd(false); setModal("project"); }} className="w-full text-left px-4 py-2 hover:bg-foreground/5 text-sm text-foreground/80 transition">
                New Project
              </button>
              <button onClick={() => { setShowQuickAdd(false); setModal("expense"); fetchProjectsForExpense(); }} className="w-full text-left px-4 py-2 hover:bg-foreground/5 text-sm text-foreground/80 transition">
                New Expense
              </button>
              <button onClick={() => { setShowQuickAdd(false); setModal("support"); }} className="w-full text-left px-4 py-2 hover:bg-foreground/5 text-sm text-foreground/80 transition">
                New Support Request
              </button>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => {
              if (!showNotifications) fetchNotifications();
              setShowNotifications(!showNotifications);
            }}
            onDoubleClick={() => {
              setShowNotifications(false);
              setShowAllNotifications(true);
            }}
            className="relative text-foreground/70 hover:text-foreground transition flex items-center"
          >
            <Bell className="w-5 h-5 cursor-pointer" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center pointer-events-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-10 z-50 w-80 bg-background border border-foreground/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10 bg-foreground/[0.02]">
                <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    router.push("/settings");
                  }}
                  className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition"
                  title="Notification Settings"
                >
                  <Settings size={14} />
                </button>
              </div>

              <div className="max-h-[320px] overflow-y-auto overscroll-contain">
                {notifications.length > 0 ? (
                  notifications.map((notif: any) => (
                    <div
                      key={notif.id}
                      className={clsx(
                        "p-4 border-b border-foreground/5 transition hover:bg-foreground/[0.02] cursor-pointer",
                        !notif.is_read && "bg-blue-500/5 dark:bg-blue-500/10"
                      )}
                      onClick={() => {
                        if (notif.link) {
                          setShowNotifications(false);
                          router.push(notif.link);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">{notif.title}</span>
                        <span className="text-[10px] text-foreground/40 whitespace-nowrap">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/60 line-clamp-2">{notif.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-foreground/50 text-sm flex flex-col items-center">
                    <Bell className="w-8 h-8 mb-2 opacity-20" />
                    No notifications
                  </div>
                )}
              </div>

              <div className="p-2 border-t border-foreground/10 bg-foreground/[0.02]">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    setShowAllNotifications(true);
                  }}
                  className="w-full py-2 text-xs font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar + Dropdown */}
        <div 
          ref={menuRef} 
          className="relative py-2" // Add py-2 to create a larger hover area and prevent gap closing
          onMouseEnter={() => setShowUserMenu(true)}
          onMouseLeave={() => setShowUserMenu(false)}
        >
          <div
            className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-semibold text-white cursor-pointer ring-2 ring-transparent hover:ring-blue-400/50 transition"
          >
            AS
          </div>

          {showUserMenu && (
            <div className="absolute right-0 top-10 z-50 w-48 bg-background border border-foreground/10 rounded-lg shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-foreground/5">
                <p className="text-sm font-medium text-foreground">Agusain</p>
                <p className="text-xs text-foreground/50 truncate">test@example.com</p>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); router.push("/settings/profile"); }}
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

      {/* Global Modals */}
      <AddTaskModal isOpen={modal === "task"} onClose={() => setModal(null)} onTaskCreated={() => { setModal(null); window.location.reload(); }} />
      {modal === "client" && <AddClientModal onClose={() => setModal(null)} onCreated={() => { setModal(null); window.location.reload(); }} />}
      {modal === "project" && <AddProjectModal onClose={() => setModal(null)} onCreated={() => { setModal(null); window.location.reload(); }} />}
      <NewExpenseModal isOpen={modal === "expense"} onClose={() => setModal(null)} onExpenseCreated={() => { setModal(null); window.location.reload(); }} projects={projects} />
      <AddRequestModal isOpen={modal === "support"} onClose={() => setModal(null)} onCreated={() => { setModal(null); window.location.reload(); }} />
      <NotificationsPanel isOpen={showAllNotifications} onClose={() => setShowAllNotifications(false)} />
    </header>
  );
}

