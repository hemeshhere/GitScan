// ─── RepoScanner Component ──────────────────────────────────────────────────
// Complete GitHub repository scanner with debounced validation, live progress,
// stall/offline warnings, resilient error recovery, and zero-leak success state.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  WifiOff,
  Clock,
  CheckCircle2,
  ExternalLink,
  X,
  FileCode,
} from "lucide-react";
import { useScan } from "../../hooks/useScan";
import { parseRepoUrl } from "../../lib/parseRepoUrl";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ErrorState } from "../ui/ErrorState";
import { cn } from "../../lib/utils";

export function RepoScanner({ className }: { className?: string }) {
  const { state, startScan, cancelScan, retry, reset } = useScan();

  const [inputVal, setInputVal] = useState("");
  const [touched, setTouched] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live debounced validation (250ms)
  useEffect(() => {
    if (!touched) {
      setInlineError(null);
      return;
    }

    if (!inputVal.trim()) {
      setInlineError(null);
      return;
    }

    const timer = setTimeout(() => {
      const parsed = parseRepoUrl(inputVal);
      if (!parsed.ok) {
        setInlineError(parsed.message);
      } else {
        setInlineError(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inputVal, touched]);

  const handleBlur = () => {
    setTouched(true);
    if (inputVal.trim()) {
      const parsed = parseRepoUrl(inputVal);
      if (!parsed.ok) {
        setInlineError(parsed.message);
      } else {
        setInlineError(null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!inputVal.trim()) {
      setInlineError("Enter a GitHub repository URL");
      inputRef.current?.focus();
      return;
    }

    const parsed = parseRepoUrl(inputVal);
    if (!parsed.ok) {
      setInlineError(parsed.message);
      inputRef.current?.focus();
      return;
    }

    setInlineError(null);
    startScan(inputVal);
  };

  const handleEditUrl = () => {
    reset();
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleStartOver = () => {
    setInputVal("");
    setTouched(false);
    setInlineError(null);
    reset();
    inputRef.current?.focus();
  };

  const isScanning = state.phase === "validating" || state.phase === "submitting" || state.phase === "queued" || state.phase === "running";

  return (
    <div className={cn("rounded-card border border-border bg-surface p-5 space-y-4 shadow-sm", className)}>
      {/* Title & subtitle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-[4px] bg-accent flex items-center justify-center">
            <ShieldCheck size={12} className="text-bg" strokeWidth={2.5} />
          </span>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Public Repository Scanner
          </span>
        </div>
        {state.phase !== "idle" && (
          <button
            onClick={handleStartOver}
            className="text-2xs text-muted hover:text-primary flex items-center gap-1 transition-colors duration-fast"
            aria-label="Start a new scan"
          >
            <RotateCcw size={11} /> Start new scan
          </button>
        )}
      </div>

      {/* Input Form */}
      {state.phase === "idle" && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onBlur={handleBlur}
                placeholder="https://github.com/facebook/react or owner/repo"
                aria-invalid={Boolean(inlineError)}
                aria-describedby={inlineError ? "repo-url-error" : undefined}
                className={cn(
                  "w-full h-10 pl-9 pr-3 rounded-input bg-raised border text-xs font-mono text-primary placeholder:text-muted transition-colors duration-fast focus:outline-none",
                  inlineError
                    ? "border-critical/60 focus:border-critical focus:ring-1 focus:ring-critical/30"
                    : "border-border focus:border-accent"
                )}
              />
            </div>
            <Button
              type="submit"
              size="md"
              variant="primary"
              disabled={isScanning}
              className="shrink-0"
            >
              Scan repository <ArrowRight size={14} />
            </Button>
          </div>

          {/* Inline field error */}
          {inlineError && (
            <p
              id="repo-url-error"
              role="alert"
              className="text-xs text-critical flex items-center gap-1.5 pt-0.5"
            >
              <AlertTriangle size={12} className="shrink-0" />
              {inlineError}
            </p>
          )}

          <p className="text-2xs text-muted">
            Paste any public GitHub repository. Fast diff analysis against 500+ security rules without writing to remote.
          </p>
        </form>
      )}

      {/* Progress & Live Polling State */}
      {isScanning && (
        <div aria-live="polite" className="space-y-3 py-2">
          {/* Target Header */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-primary truncate max-w-[320px]">
              {state.normalizedUrl || state.repoUrl}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-tabular text-muted">
                {state.progress}%
              </span>
              <Button size="sm" variant="ghost" onClick={cancelScan}>
                <X size={12} /> Stop
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-raised overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(5, state.progress))}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Step description & metrics */}
          <div className="flex items-center justify-between text-2xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              {state.currentStep || "Processing repository..."}
            </span>
            {state.totalFiles > 0 && (
              <span className="font-tabular">
                {state.filesScanned} / {state.totalFiles} files
              </span>
            )}
          </div>

          {/* Stalled Warning banner */}
          <AnimatePresence>
            {state.stalledWarning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-input border border-high/30 bg-high-bg px-3 py-2 text-xs text-high flex items-center gap-2"
              >
                <Clock size={13} className="shrink-0" />
                <span>This repository scan is taking longer than usual. Still checking rules...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reconnecting banner */}
          <AnimatePresence>
            {state.isReconnecting && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-input border border-border bg-raised px-3 py-2 text-xs text-secondary flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-high animate-pulse shrink-0" />
                <span>Reconnecting to scanner service... attempt #{state.consecutivePollErrors}/3</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Offline banner */}
          <AnimatePresence>
            {state.isOffline && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-input border border-high/30 bg-high-bg px-3 py-2 text-xs text-high flex items-center gap-2"
              >
                <WifiOff size={13} className="shrink-0" />
                <span>You are currently offline. Polling paused until connection restores.</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Error state */}
      {state.phase === "failed" && state.error && (
        <ErrorState
          error={state.error}
          onRetry={token => retry(token)}
          onEditUrl={handleEditUrl}
          onStartOver={handleStartOver}
        />
      )}

      {/* Cancelled state (info state, calm display) */}
      {state.phase === "cancelled" && (
        <div className="rounded-card border border-border bg-surface p-4 flex items-center justify-between text-xs">
          <span className="text-secondary">Scan was stopped by user.</span>
          <Button size="sm" variant="secondary" onClick={handleStartOver}>
            <RotateCcw size={12} /> Scan another repository
          </Button>
        </div>
      )}

      {/* Completed Success State (Zero findings OR findings list) */}
      {state.phase === "completed" && state.report && (
        <div className="space-y-4 pt-1">
          {/* Summary Banner */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-primary">
                  {state.report.owner}/{state.report.repo}
                </span>
                <a
                  href={state.report.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted hover:text-primary transition-colors duration-fast"
                  aria-label="View on GitHub"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
              <p className="text-2xs text-muted font-tabular">
                Scanned {state.report.scannedFilesCount || state.filesScanned} files in {(state.report.durationMs / 1000).toFixed(1)}s
              </p>
            </div>

            <Button size="sm" variant="ghost" onClick={handleStartOver}>
              <RotateCcw size={12} /> Scan another
            </Button>
          </div>

          {/* Zero findings = SUCCESS */}
          {state.report.totalSecrets === 0 ? (
            <div className="rounded-card border border-accent/30 bg-accent-dim p-5 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-accent text-bg flex items-center justify-center mx-auto mb-1">
                <CheckCircle2 size={18} strokeWidth={2.5} />
              </div>
              <p className="text-sm font-semibold text-primary">Clean repository</p>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                No secrets or exposed API tokens were found across scanned commits and files.
              </p>
            </div>
          ) : (
            /* Leaked Secrets List */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-critical flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  {state.report.totalSecrets} leaked {state.report.totalSecrets === 1 ? "secret" : "secrets"} found
                </p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {state.report.findings.map(finding => (
                  <div
                    key={finding.id}
                    className="rounded-input border border-border bg-raised p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={finding.severity} />
                        <span className="font-medium text-primary">{finding.ruleName}</span>
                      </div>
                      <span className="font-mono text-2xs text-muted">
                        {finding.file}:{finding.line}
                      </span>
                    </div>

                    <code className="block font-mono text-2xs bg-surface border border-border-subtle rounded px-2 py-1 text-critical overflow-x-auto">
                      {finding.secret}
                    </code>

                    {finding.whyFlagged && (
                      <p className="text-2xs text-secondary">{finding.whyFlagged}</p>
                    )}

                    {finding.remediationSteps && finding.remediationSteps.length > 0 && (
                      <div className="pt-1 border-t border-border-subtle/50 text-2xs text-muted">
                        <span className="font-medium text-secondary">Remediation: </span>
                        {finding.remediationSteps[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
