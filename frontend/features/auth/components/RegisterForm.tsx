"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { register, loginWithGoogle, loginWithMicrosoft } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/toast";

interface RegisterFormProps {
    onSwitchToLogin: () => void;
}

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
    if (!password) return { label: "", color: "", width: "0%" };
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const score = [password.length >= 8, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "33%" };
    if (score <= 3) return { label: "Fair", color: "bg-yellow-500", width: "60%" };
    return { label: "Strong", color: "bg-green-500", width: "100%" };
}

interface OrgOption { id: string; name: string; logo_url?: string | null; }

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [organizationId, setOrganizationId] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<"google" | "microsoft" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [orgs, setOrgs] = useState<OrgOption[]>([]);
    const [pendingApproval, setPendingApproval] = useState(false);

    const API = process.env.NEXT_PUBLIC_API_URL || "";

    // Fetch public org list for dropdown
    useEffect(() => {
        fetch(`${API}/api/organizations/public`)
            .then(r => r.ok ? r.json() : [])
            .then((data) => setOrgs(Array.isArray(data) ? data : []))
            .catch(() => setOrgs([]));
    }, [API]);

    const strength = getPasswordStrength(password);
    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
    const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await register(fullName, email, password, confirmPassword, organizationId || undefined);
            if (result.pending) {
                setPendingApproval(true);
                return;
            }
            showSuccess(`Account created! Welcome, ${result.user?.full_name ?? fullName}!`);
            router.push("/home");
            router.refresh();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
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
        <div className="flex flex-col h-full justify-center px-8 py-10 lg:px-12 overflow-y-auto max-w-md mx-auto w-full">
            {/* Pending Approval Screen */}
            {pendingApproval && (
                <div className="flex flex-col items-center justify-center text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-5">
                        <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Registration Submitted!</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        Your account is <span className="text-amber-400 font-medium">pending approval</span>.
                        Your organisation admin will review and approve your request.
                        You&apos;ll receive an email once approved.
                    </p>
                    <div className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left mb-6">
                        <p className="text-amber-300 text-xs font-semibold mb-1">What happens next?</p>
                        <ul className="text-slate-400 text-xs space-y-1">
                            <li>1. Verify your email (check your inbox)</li>
                            <li>2. Wait for admin approval</li>
                            <li>3. Sign in once approved</li>
                        </ul>
                    </div>
                    <button
                        onClick={onSwitchToLogin}
                        className="w-full py-3 border border-white/15 hover:border-blue-500 text-white text-sm font-medium rounded-xl transition-all"
                    >
                        Back to Sign In
                    </button>
                </div>
            )}

            {!pendingApproval && (<>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
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

            <div className="mb-7">
                <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
                <p className="text-slate-400 text-sm">Get started with your free account today.</p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-4 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v4m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                    </svg>
                    <p className="text-red-300 text-sm">{error}</p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="relative">
                    <label htmlFor="reg-name"
                        className="absolute -top-2.5 left-3 text-xs font-medium text-blue-400 bg-[#0d0f18] px-1 z-10 pointer-events-none">
                        Full Name
                    </label>
                    <input
                        id="reg-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        required
                        disabled={isLoading}
                        className="w-full px-4 py-3.5 bg-white/5 border border-white/15 hover:border-white/30 focus:border-blue-500 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 text-sm"
                    />
                </div>

                {/* Email */}
                <div className="relative">
                    <label htmlFor="reg-email"
                        className="absolute -top-2.5 left-3 text-xs font-medium text-blue-400 bg-[#0d0f18] px-1 z-10 pointer-events-none">
                        Email
                    </label>
                    <input
                        id="reg-email"
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
                    <label htmlFor="reg-password"
                        className="absolute -top-2.5 left-3 text-xs font-medium text-blue-400 bg-[#0d0f18] px-1 z-10 pointer-events-none">
                        Password
                    </label>
                    <input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        disabled={isLoading}
                        className="w-full px-4 py-3.5 pr-12 bg-white/5 border border-white/15 hover:border-white/30 focus:border-blue-500 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                        {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M3 3l18 18" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Password strength bar */}
                {password && (
                    <div className="space-y-1 -mt-1">
                        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${strength.color}`}
                                style={{ width: strength.width }}
                            />
                        </div>
                        <p className={`text-xs ${strength.color.replace("bg-", "text-")}`}>
                            Password strength: {strength.label}
                        </p>
                    </div>
                )}

                {/* Confirm Password */}
                <div className="relative">
                    <label htmlFor="reg-confirm"
                        className="absolute -top-2.5 left-3 text-xs font-medium text-blue-400 bg-[#0d0f18] px-1 z-10 pointer-events-none">
                        Confirm Password
                    </label>
                    <input
                        id="reg-confirm"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        required
                        disabled={isLoading}
                        className={`w-full px-4 py-3.5 pr-12 bg-white/5 border rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 text-sm ${passwordsMismatch
                            ? "border-red-500/60 focus:ring-red-500/20 focus:border-red-500"
                            : passwordsMatch
                                ? "border-green-500/60 focus:ring-green-500/20 focus:border-green-500"
                                : "border-white/15 hover:border-white/30 focus:border-blue-500 focus:ring-blue-500/20"
                            }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                        {showConfirm ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M3 3l18 18" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                    {passwordsMatch && (
                        <div className="absolute right-11 top-1/2 -translate-y-1/2">
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    )}
                </div>
                {passwordsMismatch && (
                    <p className="text-xs text-red-400 -mt-2">Passwords do not match</p>
                )}

                {/* Organisation */}
                <div className="relative">
                    <label htmlFor="reg-org"
                        className="absolute -top-2.5 left-3 text-xs font-medium text-blue-400 bg-[#0d0f18] px-1 z-10 pointer-events-none">
                        Organisation <span className="text-slate-500">(optional)</span>
                    </label>
                    <select
                        id="reg-org"
                        value={organizationId}
                        onChange={(e) => setOrganizationId(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-4 py-3.5 bg-white/5 border border-white/15 hover:border-white/30 focus:border-blue-500 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 text-sm appearance-none"
                    >
                        <option value="" className="bg-[#0d0f18] text-slate-400">Select your organisation...</option>
                        {orgs.map(org => (
                            <option key={org.id} value={org.id} className="bg-[#0d0f18]">{org.name}</option>
                        ))}
                    </select>
                </div>

                {/* Create Account Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    id="register-submit-btn"
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-400 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-2">
                    {isLoading ? (
                        <>
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Creating account...
                        </>
                    ) : "Create account"}
                </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-slate-500">or sign up with</span>
                <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    id="register-google-btn"
                    type="button"
                    onClick={handleGoogle}
                    disabled={oauthLoading !== null}
                    className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 text-sm font-medium">
                    {oauthLoading === "google" ? (
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
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
                    Google
                </button>

                <button
                    id="register-microsoft-btn"
                    type="button"
                    onClick={handleMicrosoft}
                    disabled={oauthLoading !== null}
                    className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 text-sm font-medium">
                    {oauthLoading === "microsoft" ? (
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
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
                    Microsoft
                </button>
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors underline-offset-2 hover:underline">
                    Sign in
                </button>
            </p>
            </>
            )}
        </div>
    );
}
