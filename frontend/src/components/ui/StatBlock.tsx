import { cn } from "../../lib/utils";

interface StatBlockProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  className?: string;
}

export function StatBlock({ label, value, delta, deltaLabel, className }: StatBlockProps) {
  const isPositiveDelta = delta !== undefined && delta > 0;
  const isNegativeDelta = delta !== undefined && delta < 0;

  return (
    <div className={cn("p-5 rounded-card border border-border bg-surface", className)}>
      <p className="text-2xs font-medium text-muted uppercase tracking-wider mb-3">{label}</p>
      <p className="text-xl font-semibold text-primary font-tabular tracking-tight mb-1.5">
        {value}
      </p>
      {delta !== undefined && (
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-tabular",
              isPositiveDelta && "text-critical",
              isNegativeDelta && "text-accent",
              delta === 0 && "text-muted"
            )}
          >
            {delta > 0 ? "+" : ""}{delta}
          </span>
          {deltaLabel && (
            <span className="text-2xs text-muted">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
