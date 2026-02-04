import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protected routes that require authentication
const protectedPaths = [
  "/clients",
  "/divisions",
  "/employees",
  "/projects",
  "/tasks",
  "/timesheets",
  "/expenses",
  "/dashboard",
  "/settings",
];

// Public routes that should redirect authenticated users
const authPaths = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  // Check if the path is protected
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Check if the path is an auth path
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  // If protected path and no token, redirect to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If auth path and has token, redirect to clients (dashboard)
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL("/clients", request.url));
  }

  return NextResponse.next();
}
