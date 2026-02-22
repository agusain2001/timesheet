import { ShieldOff } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
            <div className="text-center max-w-md">
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 mb-6 mx-auto">
                    <ShieldOff size={36} className="text-red-500" />
                </div>

                {/* Heading */}
                <h1 className="text-3xl font-bold text-foreground mb-2">
                    Access Denied
                </h1>
                <p className="text-sm text-foreground/50 mb-8 leading-relaxed">
                    You don&apos;t have permission to view this page. Contact your administrator to request access, or return to the home page.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/home"
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                    >
                        Go to Home
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-foreground/10 bg-foreground/[0.03] hover:bg-foreground/[0.06] text-foreground/70 hover:text-foreground text-sm font-medium transition-colors"
                    >
                        Go Back
                    </button>
                </div>

                {/* Error code */}
                <p className="mt-8 text-xs text-foreground/20 font-mono">HTTP 403 — Forbidden</p>
            </div>
        </div>
    );
}
