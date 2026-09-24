import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-8 w-full rounded-input border bg-surface px-3 text-sm text-primary",
          "placeholder:text-muted",
          "transition-colors duration-fast",
          "border-border hover:border-[#38383E] focus:border-accent",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-critical focus:border-critical focus-visible:ring-critical",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex w-full rounded-input border bg-surface px-3 py-2 text-sm text-primary font-mono",
          "placeholder:text-muted",
          "transition-colors duration-fast resize-none",
          "border-border hover:border-[#38383E] focus:border-accent",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-critical",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
