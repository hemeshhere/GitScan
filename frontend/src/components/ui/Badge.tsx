import { cn } from "../../lib/utils";
import type { Severity, Status } from "../../data/findings";

type BadgeVariant = Severity | "clean" | "blocked" | "open" | "resolved" | "false_positive" | "installed" | "webhook_only" | "not_connected";

const variantMap: Record<BadgeVariant, string> = {
  critical:       "bg-critical-bg text-critical border border-critical/20",
  high:           "bg-high-bg text-high border border-high/20",
  medium:         "bg-medium-bg text-medium border border-medium/20",
  low:            "bg-low-bg text-low border border-low/20",
  clean:          "bg-accent-dim text-accent border border-accent/20",
  blocked:        "bg-critical-bg text-critical border border-critical/20",
  open:           "bg-raised text-secondary border border-border",
  resolved:       "bg-accent-dim text-accent border border-accent/20",
  false_positive: "bg-raised text-muted border border-border",
  installed:      "bg-accent-dim text-accent border border-accent/20",
  webhook_only:   "bg-medium-bg text-medium border border-medium/20",
  not_connected:  "bg-raised text-muted border border-border",
};

const labels: Record<BadgeVariant, string> = {
  critical:       "Critical",
  high:           "High",
  medium:         "Medium",
  low:            "Low",
  clean:          "Clean",
  blocked:        "Blocked",
  open:           "Open",
  resolved:       "Resolved",
  false_positive: "False positive",
  installed:      "Installed",
  webhook_only:   "Webhook only",
  not_connected:  "Not connected",
};

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
  label?: string;
}

export function Badge({ variant, className, label }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-badge px-1.5 py-0.5 text-2xs font-medium font-tabular uppercase tracking-wide whitespace-nowrap",
        variantMap[variant] ?? "bg-raised text-secondary",
        className
      )}
    >
      {label ?? labels[variant] ?? variant}
    </span>
  );
}

// Status dot (pulsing for live, static for resolved)
interface LiveDotProps {
  active?: boolean;
  className?: string;
}

export function LiveDot({ active = true, className }: LiveDotProps) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        active ? "bg-accent animate-pulse-dot" : "bg-border",
        className
      )}
      aria-hidden="true"
    />
  );
}

// Severity dot (no animation)
export function SeverityDot({ severity, className }: { severity: Severity | null; className?: string }) {
  const colorMap: Record<string, string> = {
    critical: "bg-critical",
    high:     "bg-high",
    medium:   "bg-medium",
    low:      "bg-low",
  };
  return (
    <span
      className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", severity ? colorMap[severity] : "bg-accent", className)}
      aria-hidden="true"
    />
  );
}

// Status badge for findings
export function StatusBadge({ status }: { status: Status | "blocked" | "clean" }) {
  return <Badge variant={status} />;
}
