"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { handleOAuthCallback } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/toast";

export default function OAuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const process = async () => {
            try {
                const result = await handleOAuthCallback();
                if (!result) throw new Error("No response from OAuth callback.");
                showSuccess(`Welcome, ${result.user.full_name}!`);
                router.replace("/home");
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Authentication failed.";
                setErrorMsg(msg);
                setStatus("error");
                showError(msg);
            }
        };
        process();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0d0f18]">
            <div className="text-center px-6">
                {status === "loading" ? (
                    <>
                        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Signing you in…</h2>
                        <p className="text-slate-400 text-sm">Completing authentication, please wait.</p>
                        <div className="mt-6 flex justify-center gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <span
                                    key={i}
                                    className="w-2 h-2 rounded-full bg-blue-500"
                                    style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 9v4m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Authentication failed</h2>
                        <p className="text-slate-400 text-sm mb-6">{errorMsg}</p>
                        <button
                            onClick={() => router.replace("/login")}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors text-sm">
                            Back to Login
                        </button>
                    </>
                )}
            </div>

            <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
        </div>
    );
}
