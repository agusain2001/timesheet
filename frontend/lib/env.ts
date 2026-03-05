/**
 * Environment variables configuration
 * Throws error in development if required env vars are missing
 */

const requiredEnv = ["NEXT_PUBLIC_API_URL"] as const;

function validateEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0 && process.env.NODE_ENV === "development") {
    console.warn(
      `⚠️  Missing environment variables: ${missing.join(", ")}\n` +
        "Copy .env.example to .env.local and fill in the values.",
    );
  }
}

validateEnv();

export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  apiTimeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000", 10),
  apiSecret: process.env.API_SECRET || "",
  authRedirectUrl: process.env.AUTH_REDIRECT_URL || "http://localhost:3000",
  enableNotifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === "true",
  enableValidation: process.env.NEXT_PUBLIC_ENABLE_VALIDATION === "true",
} as const;
