"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function Button({
  children,
  icon,
  variant = "primary",
  type = "button",
  onClick,
  className,
  disabled = false,
}: ButtonProps) {
  const baseStyles =
    "flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition duration-200";

  const variants = {
    primary:
      "bg-foreground text-background hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed",
    secondary:
      "bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed",
    ghost:
      "text-foreground hover:bg-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(baseStyles, variants[variant], className)}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {children}
    </button>
  );
}
