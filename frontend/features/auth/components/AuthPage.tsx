"use client";

import { useState } from "react";
import Image from "next/image";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function AuthPage() {
    const [view, setView] = useState<"login" | "register">("login");

    return (
        <div className="min-h-screen flex bg-[#0d0f18]">
            {/* ── Left Panel: Form ───────────────────────────────────────────── */}
            <div className="w-full lg:w-1/2 flex flex-col relative overflow-hidden">
                {/* Subtle glow in top-left */}
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

                {/* Animated view transition */}
                <div
                    key={view}
                    className="relative z-10 h-full"
                    style={{
                        animation: "fadeSlideIn 0.35s ease forwards",
                    }}
                >
                    {view === "login" ? (
                        <LoginForm onSwitchToRegister={() => setView("register")} />
                    ) : (
                        <RegisterForm onSwitchToLogin={() => setView("login")} />
                    )}
                </div>
            </div>

            {/* ── Right Panel: Visual ─────────────────────────────────────────── */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <Image
                    src="/login-visual.png"
                    alt="Abstract blue waves"
                    fill
                    className="object-cover"
                    priority
                />
                {/* Overlay gradient for depth */}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#0d0f18]/60" />

                {/* Floating badge */}
                <div className="absolute bottom-10 left-10 right-10">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-white font-semibold text-sm">TimeSheet Pro</span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Manage time, projects & teams — all in one beautiful workspace.
                        </p>
                    </div>
                </div>
            </div>

            {/* Animation keyframes */}
            <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
