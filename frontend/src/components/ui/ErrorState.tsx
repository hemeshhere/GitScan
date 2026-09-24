// ─── ErrorState Component ────────────────────────────────────────────────────
// Accessible, styled error display with recovery action buttons and live countdowns.

import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Info, RefreshCw, KeyRound, Eye, EyeOff, RotateCcw } from "lucide-react";
import { AppError } from "../../lib/errors";
import { Button } from "./Button";
import { Input } from "./Input";
import { cn } from "../../lib/utils";

export interface ErrorStateProps {
  error: AppError;
  onRetry?: (token?: string) => void;
  onEditUrl?: () => void;
  onStartOver?: () => void;
  className?: string;
}

export function ErrorState({
  error,
  onRetry,
  onEditUrl,
  onStartOver,
  className,
}: ErrorStateProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Focus error heading for screen-reader announcement on mount
  useEffect(() => {
    headingRef.current?.focus();
  }, [error]);

  // Rate-limit countdown state
  const initialSeconds = error.retryAfterSeconds ?? 15;
  const [countdown, setCountdown] = useState<number>(error.code === "RATE_LIMITED" ? initialSeconds : 0);

  useEffect(() => {
    if (error.code !== "RATE_LIMITED" || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(c => (c > 1 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [error.code, countdown]);

  // Token input for PRIVATE_REPO or UNAUTHORIZED_TOKEN
  const needsToken = error.action === "add_token" || error.code === "PRIVATE_REPO" || error.code === "UNAUTHORIZED_TOKEN";
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);

  const handleTokenSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!tokenInput.trim() || !onRetry) return;
    setIsSubmittingToken(true);
    const token = tokenInput.trim();
    setTokenInput(""); // Immediate clear from memory
    onRetry(token);
  };

  const isInfo = error.severity === "info";
  const isWarning = error.severity === "warning";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "rounded-card border p-6 text-left transition-all duration-fast space-y-4",
        isInfo
          ? "border-border bg-surface text-primary"
          : isWarning
          ? "border-high/30 bg-high-bg text-primary"
          : "border-critical/30 bg-critical-bg text-primary",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
            isInfo
              ? "bg-raised text-secondary"
              : isWarning
              ? "bg-high/20 text-high"
              : "bg-critical/20 text-critical"
          )}
        >
          {isInfo ? (
            <Info size={16} />
          ) : isWarning ? (
            <AlertTriangle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="text-sm font-semibold tracking-tight outline-none"
          >
            {error.title}
          </h3>
          <p className="text-xs text-secondary mt-1 leading-relaxed">
            {error.code === "RATE_LIMITED" && countdown > 0
              ? `Too many scans right now. You can retry in ${countdown}s.`
              : error.message}
          </p>

          {/* Token input form for private repos & auth errors */}
          {needsToken && (
            <form onSubmit={handleTokenSubmit} className="mt-4 space-y-2">
              <label className="text-2xs font-mono uppercase tracking-wider text-muted block">
                GitHub Personal Access Token (classic or fine-grained)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    autoComplete="off"
                    autoFocus
                    className="font-mono text-xs pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors duration-fast"
                    aria-label={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <Button
                  type="submit"
                  size="md"
                  variant="primary"
                  disabled={!tokenInput.trim() || isSubmittingToken}
                >
                  <KeyRound size={13} /> Scan private repo
                </Button>
              </div>
              <p className="text-2xs text-muted">
                Tokens are used in-memory for this single scan only and are never saved or logged.
              </p>
            </form>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-3 flex-wrap">
            {/* Primary Action Button */}
            {!needsToken && error.action === "retry" && onRetry && (
              <Button size="sm" variant="primary" onClick={() => onRetry()}>
                <RefreshCw size={13} /> Try again
              </Button>
            )}

            {!needsToken && error.action === "edit_url" && onEditUrl && (
              <Button size="sm" variant="primary" onClick={onEditUrl}>
                Edit repository link
              </Button>
            )}

            {!needsToken && error.action === "wait" && onRetry && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => onRetry()}
                disabled={countdown > 0}
              >
                <RefreshCw size={13} /> {countdown > 0 ? `Wait (${countdown}s)` : "Retry now"}
              </Button>
            )}

            {/* Always available Secondary Action: Start over */}
            {onStartOver && (
              <Button size="sm" variant="ghost" onClick={onStartOver}>
                <RotateCcw size={13} /> Start over
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
