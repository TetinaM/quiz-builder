import { ReactNode } from "react";

type BadgeVariant = "primary" | "accent" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent-hover",
  neutral: "bg-border/60 text-ink-soft",
};

/** Small rounded label — question-type pills, the "correct" tag, question
 * counts. */
export function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
