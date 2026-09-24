import { forwardRef } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-bg hover:bg-[#5ED9A6] active:bg-[#35B87E] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:bg-accent/40",
  secondary:
    "bg-raised border border-border text-primary hover:bg-[#1e1e22] active:bg-[#16161a] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:opacity-50",
  ghost:
    "bg-transparent text-secondary hover:bg-raised hover:text-primary active:bg-border focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:opacity-50",
  danger:
    "bg-critical/10 text-critical border border-critical/20 hover:bg-critical/20 active:bg-critical/30 focus-visible:ring-2 focus-visible:ring-critical focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-3 text-xs gap-1.5",
  md: "h-8 px-3.5 text-sm gap-2",
  lg: "h-9 px-4 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-btn transition-colors duration-fast outline-none select-none",
          "focus-visible:outline-none",
          variantClasses[variant],
          sizeClasses[size],
          (disabled || loading) && "cursor-not-allowed",
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
