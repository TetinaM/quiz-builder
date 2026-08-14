import Link from "next/link";
import { AnchorHTMLAttributes, ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger-ghost";
type ButtonSize = "sm" | "md" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium " +
  "transition-all duration-150 ease-out active:scale-[0.97] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-md",
  outline:
    "border border-border bg-surface text-ink hover:border-primary hover:bg-primary-soft hover:text-primary",
  ghost: "text-ink-soft hover:bg-primary-soft hover:text-primary",
  "danger-ghost":
    "text-ink-soft hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  icon: "p-2",
};

function classes(variant: ButtonVariant, size: ButtonSize, className: string) {
  return `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Shared button styling — every button/button-like link in the app goes
 * through this (or LinkButton below) so hover/active/focus treatment stays
 * consistent instead of hand-rolled per usage. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={classes(variant, size, className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Same visual treatment as Button, but renders a Next.js `<Link>` — for
 * navigation that should *look* like a button (e.g. "New quiz"). Never nest
 * a real `<button>` inside an `<a>`; this is the alternative. */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={classes(variant, size, className)}
      {...props}
    />
  );
}
