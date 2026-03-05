"use client";

/**
 * Toast Notification Utilities
 * Wrapper around sonner library with consistent styling
 */

import { toast as sonnerToast } from "sonner";

export type ToastType = "success" | "error" | "warning" | "info";

const toastConfig = {
  success: {
    icon: "✓",
    style: { background: "#10b981", color: "#fff" },
  },
  error: {
    icon: "✕",
    style: { background: "#ef4444", color: "#fff" },
  },
  warning: {
    icon: "⚠",
    style: { background: "#f59e0b", color: "#fff" },
  },
  info: {
    icon: "ℹ",
    style: { background: "#3b82f6", color: "#fff" },
  },
};

/**
 * Show toast notification
 */
export function toast(message: string, type: ToastType = "info") {
  const config = toastConfig[type];
  return sonnerToast(message, {
    style: config.style,
  });
}

/**
 * Show success toast
 */
export function showSuccess(message: string) {
  return toast(message, "success");
}

/**
 * Show error toast
 */
export function showError(message: string) {
  return toast(message, "error");
}

/**
 * Show warning toast
 */
export function showWarning(message: string) {
  return toast(message, "warning");
}

/**
 * Show info toast
 */
export function showInfo(message: string) {
  return toast(message, "info");
}

/**
 * Show loading toast (non-dismissible)
 */
export function showLoading(message: string) {
  return sonnerToast.loading(message, {
    style: { background: "#8b5cf6", color: "#fff" },
  });
}

/**
 * Promise-based toast (auto closes on success/error)
 */
export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  },
): Promise<T> {
  return sonnerToast.promise(promise as any, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
    style: { background: "#3b82f6", color: "#fff" },
  }) as any as Promise<T>;
}
