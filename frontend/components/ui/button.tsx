import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "accent" | "outline" | "ghost" | "admin";
type Size = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white shadow-xs hover:bg-primary-700 focus-visible:ring-primary-500",
  secondary:
    "bg-ink text-white shadow-xs hover:bg-neutral-800 focus-visible:ring-neutral-600",
  accent:
    "bg-accent text-white shadow-xs hover:bg-accent-dark focus-visible:ring-accent",
  outline:
    "border border-neutral-300 bg-white text-ink hover:bg-neutral-50 focus-visible:ring-neutral-400",
  ghost: "bg-transparent text-primary-700 hover:bg-primary-50 focus-visible:ring-primary-400",
  admin:
    "bg-admin-accent text-white shadow-xs hover:bg-admin-accent-hover focus-visible:ring-admin-accent",
};

const sizes: Record<Size, string> = {
  xs: "h-7 px-2 text-[11px] rounded-md gap-1",
  sm: "h-8 px-2.5 text-xs rounded-md gap-1.5",
  md: "h-9 px-3.5 text-sm rounded-lg gap-2",
  lg: "h-10 px-4 text-sm rounded-xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
