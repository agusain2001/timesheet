"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, loginWithGoogle, loginWithMicrosoft } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/toast";

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "microsoft" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { user } = await login(email, password, keepLoggedIn);
      showSuccess(`Welcome back, ${user.full_name}!`);
      router.push("/home");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = () => {
    setOauthLoading("google");
    loginWithGoogle();
  };

  const handleMicrosoft = () => {
    setOauthLoading("microsoft");
    loginWithMicrosoft();
  };

  return (
    <div className="flex flex-col h-full justify-center px-8 py-12 lg:px-12 max-w-md mx-auto w-full">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-2xl font-bold">
          <span className="text-white">Time</span>
          <span className="text-blue-400">Sheet</span>
        </span>
      </div>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Sign in</h1>
        <p className="text-slate-400 text-sm">Please login to continue to your account.</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-5 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v4m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="relative">
          <label htmlFor="login-email"
            className="absolute -top-2.5 left-3 text-xs font-medium text-blue-400 bg-[#0d0f18] px-1 z-10 pointer-events-none">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            disabled={isLoading}
            className="w-full px-4 py-3.5 bg-white/5 border border-white/15 hover:border-white/30 focus:border-blue-500 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 text-sm"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <label htmlFor="login-password"
            className="absolute -top-2.5 left-3 text-xs font-medium text-blue-400 bg-[#0d0f18] px-1 z-10 pointer-events-none">
            Password
          </label>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            required
            disabled={isLoading}
            className="w-full px-4 py-3.5 pr-12 bg-white/5 border border-white/15 hover:border-white/30 focus:border-blue-500 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 text-sm"
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Keep me logged in */}
        <div className="flex items-center gap-2">
          <input
            id="keep-logged-in"
            type="checkbox"
            checked={keepLoggedIn}
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/30 cursor-pointer accent-blue-500"
          />
          <label htmlFor="keep-logged-in" className="text-sm text-slate-400 cursor-pointer select-none">
            Keep me logged in
          </label>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={isLoading}
          id="login-submit-btn"
          className="w-full py-3.5 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 active:scale-[0.98] transition-all duration-150 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in...
            </>
          ) : "Sign in"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-slate-500">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* OAuth Buttons */}
      <div className="space-y-3">
        {/* Google */}
        <button
          id="login-google-btn"
          type="button"
          onClick={handleGoogle}
          disabled={oauthLoading !== null}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
          {oauthLoading === "google" ? (
            <svg className="animate-spin w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Sign in with Google
        </button>

        {/* Microsoft / Outlook */}
        <button
          id="login-microsoft-btn"
          type="button"
          onClick={handleMicrosoft}
          disabled={oauthLoading !== null}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
          {oauthLoading === "microsoft" ? (
            <svg className="animate-spin w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23">
              <rect x="1" y="1" width="10" height="10" fill="#F25022" />
              <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
              <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
              <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
            </svg>
          )}
          Sign in with Microsoft (Outlook)
        </button>
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-slate-500">
        Need an account?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-blue-400 hover:text-blue-300 font-medium transition-colors underline-offset-2 hover:underline">
          Create one
        </button>
      </p>
    </div>
  );
}
