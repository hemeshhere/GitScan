import { useState, useEffect, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import {
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  GitCommit,
  User,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileCode,
  Search,
  CheckCircle2,
  X,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Dialog, DialogContent } from "../../components/ui/Dialog";
import { api, type DashboardStats, type ScanItem, type LeakItem } from "../../lib/api";
import { parseRepoUrl } from "../../lib/parseRepoUrl";
import { cn } from "../../lib/utils";

interface OutletCtx { openCmdPalette: () => void; }

function formatDate(isoString: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

function truncateCommit(commitId: string): string {
  if (!commitId) return "—";
  if (commitId === "ENTIRE_REPO_TREE") return "TREE SCAN";
  return commitId.slice(0, 7);
}

export default function Overview() {
  const { openCmdPalette } = useOutletContext<OutletCtx>();

  // Core Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Historical Scan Form States
  const [ownerInput, setOwnerInput] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [pastedUrlInput, setPastedUrlInput] = useState("");
  const [isScanningRepo, setIsScanningRepo] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Expanded Row / Modal Detail State
  const [selectedScan, setSelectedScan] = useState<ScanItem | null>(null);
  const [expandedScanId, setExpandedScanId] = useState<string | null>(null);

  // Fetch Stats & Recent Scans
  const fetchData = useCallback(async (showSpin = false) => {
    if (showSpin) setIsRefreshing(true);
    try {
      const [statsData, scansData] = await Promise.all([
        api.getStats(),
        api.getScans(),
      ]);
      if (statsData) setStats(statsData);
      if (scansData) setScans(scansData);
    } catch {
      // Backend may be offline or starting up
    } finally {
      setLoading(false);
      if (showSpin) setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling Strategy: every 6 seconds to keep dashboard live
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle URL paste helper
  const handleUrlPaste = (val: string) => {
    setPastedUrlInput(val);
    if (!val.trim()) return;
    const parsed = parseRepoUrl(val);
    if (parsed.ok) {
      setOwnerInput(parsed.owner);
      setRepoInput(parsed.repo);
    }
  };

  // Submit Historical Scan (POST /scan-repo)
  const handleHistoricalScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const owner = ownerInput.trim();
    const repo = repoInput.trim();

    if (!owner || !repo) {
      setScanMessage({ type: "error", text: "Please provide both Repository Owner and Repository Name." });
      return;
    }

    setIsScanningRepo(true);
    setScanMessage(null);

    try {
      const res = await api.scanRepo(owner, repo);
      if (res && res.success) {
        setScanMessage({
          type: "success",
          text: `Historical scan complete for ${owner}/${repo}. Found ${res.leaksFound} ${res.leaksFound === 1 ? "leak" : "leaks"}.`,
        });
        // Clear inputs and refresh live data immediately
        setOwnerInput("");
        setRepoInput("");
        setPastedUrlInput("");
        await fetchData(true);
      } else {
        setScanMessage({
          type: "error",
          text: res?.message || "Historical scan failed. Check repository accessibility.",
        });
      }
    } catch (err: unknown) {
      setScanMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to communicate with scanner backend.",
      });
    } finally {
      setIsScanningRepo(false);
    }
  };

  const hasWarning = (stats?.leaksFound ?? 0) > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Security Overview"
        onSearchClick={openCmdPalette}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono text-muted flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Live Polling (6s)
            </span>
            <button
              onClick={() => fetchData(true)}
              aria-label="Refresh Dashboard"
              className="text-muted hover:text-primary p-1.5 rounded transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin text-accent" : ""} />
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 space-y-8 max-w-[1240px] mx-auto">

          {/* 1. Top-Level Metric Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Scans Card */}
            <div className="p-5 rounded-card border border-border bg-surface flex flex-col justify-between">
              <div>
                <p className="text-2xs font-mono uppercase tracking-wider text-muted mb-1 flex items-center justify-between">
                  <span>Total Scans Processed</span>
                  <GitCommit size={14} className="text-muted" />
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold font-tabular text-primary">
                    {loading ? "..." : (stats?.totalScans ?? 0).toLocaleString()}
                  </span>
                  <span className="text-2xs text-muted">commits & trees</span>
                </div>
              </div>
              <p className="text-2xs text-muted mt-3">Live webhook & historical scans</p>
            </div>

            {/* Leaks Found Card (Highlights Red if > 0) */}
            <div
              className={cn(
                "p-5 rounded-card border transition-all duration-fast flex flex-col justify-between",
                hasWarning
                  ? "border-critical/60 bg-critical-bg shadow-sm"
                  : "border-border bg-surface"
              )}
            >
              <div>
                <p className="text-2xs font-mono uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className={hasWarning ? "text-critical font-medium" : "text-muted"}>
                    Active Leaks Detected
                  </span>
                  {hasWarning ? (
                    <AlertTriangle size={15} className="text-critical" />
                  ) : (
                    <ShieldCheck size={15} className="text-accent" />
                  )}
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span
                    className={cn(
                      "text-2xl font-bold font-tabular",
                      hasWarning ? "text-critical" : "text-accent"
                    )}
                  >
                    {loading ? "..." : (stats?.leaksFound ?? 0).toLocaleString()}
                  </span>
                  <span className="text-2xs text-muted">secrets flagged</span>
                </div>
              </div>
              <p
                className={cn(
                  "text-2xs mt-3",
                  hasWarning ? "text-critical/90 font-medium" : "text-muted"
                )}
              >
                {hasWarning
                  ? "Immediate remediation required"
                  : "All repositories clean"}
              </p>
            </div>

            {/* Clean Scans Rate */}
            <div className="p-5 rounded-card border border-border bg-surface flex flex-col justify-between">
              <div>
                <p className="text-2xs font-mono uppercase tracking-wider text-muted mb-1 flex items-center justify-between">
                  <span>Pass Rate</span>
                  <CheckCircle2 size={14} className="text-accent" />
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold font-tabular text-primary">
                    {stats && stats.totalScans > 0
                      ? `${Math.max(0, 100 - Math.round((stats.leaksFound / stats.totalScans) * 100))}%`
                      : "100%"}
                  </span>
                  <span className="text-2xs text-muted">clean commits</span>
                </div>
              </div>
              <p className="text-2xs text-muted mt-3">Verified by AST secret parser</p>
            </div>

            {/* Backend Pipeline Status */}
            <div className="p-5 rounded-card border border-border bg-surface flex flex-col justify-between">
              <div>
                <p className="text-2xs font-mono uppercase tracking-wider text-muted mb-1 flex items-center justify-between">
                  <span>Scanner Engine</span>
                  <span className="w-2 h-2 rounded-full bg-accent" />
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-sm font-semibold text-primary font-mono">
                    AST + Deep Tree
                  </span>
                </div>
              </div>
              <p className="text-2xs text-muted mt-3">Local endpoint: /api/stats & /api/scans</p>
            </div>
          </section>

          {/* 2. Historical Scan Input Form */}
          <section className="rounded-card border border-border bg-surface p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Search size={15} className="text-accent" />
                  Trigger Historical Repository Scan
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Deeply analyzes active tree files (like committed .env/.pem) and AST diffs of the last 10 commits.
                </p>
              </div>
            </div>

            <form onSubmit={handleHistoricalScan} className="space-y-3">
              {/* Optional single URL helper */}
              <div className="relative">
                <input
                  type="text"
                  value={pastedUrlInput}
                  onChange={e => handleUrlPaste(e.target.value)}
                  placeholder="Paste GitHub URL to auto-fill (e.g. https://github.com/hemeshhere/hackathon-scanner-test)"
                  className="w-full h-8 px-3 rounded-input bg-raised border border-border-subtle text-xs font-mono text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>

              {/* Explicit Owner and Repo Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-2xs font-mono text-muted uppercase">Repository Owner</label>
                  <Input
                    value={ownerInput}
                    onChange={e => setOwnerInput(e.target.value)}
                    placeholder="e.g. hemeshhere"
                    className="font-mono text-xs"
                    disabled={isScanningRepo}
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-2xs font-mono text-muted uppercase">Repository Name</label>
                  <Input
                    value={repoInput}
                    onChange={e => setRepoInput(e.target.value)}
                    placeholder="e.g. hackathon-scanner-test"
                    className="font-mono text-xs"
                    disabled={isScanningRepo}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={isScanningRepo || !ownerInput.trim() || !repoInput.trim()}
                  >
                    {isScanningRepo ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Scanning tree...
                      </>
                    ) : (
                      <>
                        Scan Repository <ArrowRight size={13} />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Toast / Status banner */}
              {scanMessage && (
                <div
                  className={cn(
                    "rounded-input p-3 text-xs flex items-center justify-between border",
                    scanMessage.type === "success"
                      ? "bg-accent-dim border-accent/30 text-accent"
                      : "bg-critical-bg border-critical/30 text-critical"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {scanMessage.type === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {scanMessage.text}
                  </span>
                  <button onClick={() => setScanMessage(null)} className="p-0.5 hover:opacity-75">
                    <X size={13} />
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* 3. Live Scan Data Table */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-primary">Live Scan Activity</h2>
                <p className="text-xs text-muted">
                  50 most recent webhook events and historical scans from MongoDB.
                </p>
              </div>
              <span className="text-2xs text-muted font-tabular">
                {scans.length} {scans.length === 1 ? "record" : "records"} loaded
              </span>
            </div>

            <div className="rounded-card border border-border bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-raised/50 text-2xs uppercase tracking-wider text-muted font-mono">
                      <th className="py-2.5 px-4 w-8"></th>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Repository</th>
                      <th className="py-2.5 px-4">Commit</th>
                      <th className="py-2.5 px-4">Author</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {scans.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted">
                          {loading ? (
                            <span className="inline-flex items-center gap-2">
                              <RefreshCw size={14} className="animate-spin text-accent" />
                              Connecting to backend at /api/scans...
                            </span>
                          ) : (
                            <div className="space-y-2">
                              <ShieldCheck size={28} className="mx-auto text-muted" />
                              <p className="text-xs text-primary font-medium">No scans recorded yet</p>
                              <p className="text-2xs text-muted">
                                Trigger a historical scan above or push a commit to your configured webhook.
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      scans.map(scan => {
                        const isLeak = scan.status === "LEAK_DETECTED";
                        const isExpanded = expandedScanId === scan._id;

                        return (
                          <ScanTableRow
                            key={scan._id}
                            scan={scan}
                            isExpanded={isExpanded}
                            isLeak={isLeak}
                            onToggleExpand={() =>
                              setExpandedScanId(prev => (prev === scan._id ? null : scan._id))
                            }
                            onOpenModal={() => setSelectedScan(scan)}
                          />
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* 4. Leak Details Expansion Modal */}
      {selectedScan && (
        <LeakDetailModal
          scan={selectedScan}
          onClose={() => setSelectedScan(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-component: Table Row with Expandable Drawer ──────────────────────────

function ScanTableRow({
  scan,
  isExpanded,
  isLeak,
  onToggleExpand,
  onOpenModal,
}: {
  scan: ScanItem;
  isExpanded: boolean;
  isLeak: boolean;
  onToggleExpand: () => void;
  onOpenModal: () => void;
}) {
  return (
    <>
      <tr
        onClick={isLeak ? onToggleExpand : undefined}
        className={cn(
          "transition-colors duration-fast hover:bg-raised/40",
          isLeak && "cursor-pointer font-medium",
          isExpanded && "bg-raised/60"
        )}
      >
        {/* Expand caret */}
        <td className="py-3 px-4 text-center">
          {isLeak ? (
            <button
              onClick={e => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="text-muted hover:text-primary p-0.5"
              aria-label={isExpanded ? "Collapse leak details" : "Expand leak details"}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-border block mx-auto" />
          )}
        </td>

        {/* Timestamp */}
        <td className="py-3 px-4 font-mono text-2xs text-muted whitespace-nowrap">
          {formatDate(scan.scannedAt)}
        </td>

        {/* Repository */}
        <td className="py-3 px-4">
          <span className="font-mono text-xs text-primary font-semibold truncate block max-w-[240px]">
            {scan.repository}
          </span>
        </td>

        {/* Commit Hash */}
        <td className="py-3 px-4 font-mono text-2xs">
          <span className="px-1.5 py-0.5 rounded bg-raised border border-border text-secondary">
            {truncateCommit(scan.commitId)}
          </span>
        </td>

        {/* Author */}
        <td className="py-3 px-4 text-muted truncate max-w-[180px]">
          {scan.authorEmail || "—"}
        </td>

        {/* Status Badge */}
        <td className="py-3 px-4 text-right whitespace-nowrap">
          {isLeak ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase bg-critical-bg text-critical border border-critical/30">
              <AlertTriangle size={11} />
              LEAK DETECTED ({scan.leaks?.length ?? 0})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase bg-accent-dim text-accent border border-accent/30">
              <CheckCircle2 size={11} />
              CLEAN
            </span>
          )}
        </td>
      </tr>

      {/* Inline Expanded Leaks Area */}
      {isExpanded && isLeak && (
        <tr>
          <td colSpan={6} className="bg-surface/80 p-0 border-b border-border">
            <div className="p-4 space-y-3 bg-[#0d0d10] border-l-2 border-critical">
              <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                <span className="text-2xs font-mono uppercase tracking-wider text-critical font-semibold flex items-center gap-1.5">
                  <ShieldAlert size={13} />
                  Found {scan.leaks?.length ?? 0} Leaked {scan.leaks?.length === 1 ? "Credential" : "Credentials"} in this commit
                </span>
                <Button size="sm" variant="secondary" onClick={onOpenModal}>
                  Open Full Inspector <ExternalLink size={11} />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {scan.leaks?.map((leak, idx) => (
                  <div
                    key={leak._id ?? idx}
                    className="p-3 rounded-input border border-border bg-raised text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{leak.ruleName}</span>
                        <span className="font-mono text-2xs text-muted">[{leak.ruleId}]</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase bg-critical text-bg">
                        {leak.severity || "CRITICAL"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-2xs font-mono">
                      <div>
                        <span className="text-muted">File location: </span>
                        <span className="text-primary font-medium">{leak.file}:{leak.lineNumber}</span>
                      </div>
                      <div>
                        <span className="text-muted">Masked Secret: </span>
                        <code className="text-critical bg-surface px-1.5 py-0.5 rounded border border-border-subtle">
                          {leak.maskedSecret}
                        </code>
                      </div>
                    </div>

                    {leak.contextSnippet && (
                      <div className="text-2xs font-mono bg-[#09090b] p-2 rounded border border-border-subtle text-secondary overflow-x-auto">
                        <span className="text-muted">Snippet: </span>
                        {leak.contextSnippet}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Sub-component: Leak Details Modal ────────────────────────────────────────

function LeakDetailModal({
  scan,
  onClose,
}: {
  scan: ScanItem;
  onClose: () => void;
}) {
  const leaks = scan.leaks ?? [];

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent
        title={`Leak Details: ${scan.repository}`}
        description={`Commit: ${scan.commitId} · Author: ${scan.authorEmail}`}
        className="max-w-2xl bg-surface border-border"
      >

        <div className="space-y-4 max-h-[460px] overflow-y-auto py-2 pr-1">
          {leaks.map((leak, i) => (
            <div
              key={leak._id ?? i}
              className="p-4 rounded-card border border-border bg-raised space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-primary">{leak.ruleName}</h4>
                  <p className="text-2xs font-mono text-muted">{leak.ruleId}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold uppercase bg-critical text-bg">
                  {leak.severity || "CRITICAL"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-2xs font-mono">
                  <span className="text-muted">Target File:</span>
                  <span className="text-primary font-medium">{leak.file}:{leak.lineNumber}</span>
                </div>
                <div className="flex items-center justify-between text-2xs font-mono">
                  <span className="text-muted">Masked Secret:</span>
                  <code className="text-critical bg-surface px-2 py-0.5 rounded border border-border-subtle">
                    {leak.maskedSecret}
                  </code>
                </div>
              </div>

              {leak.contextSnippet && (
                <div className="space-y-1">
                  <p className="text-2xs text-muted uppercase font-mono">Context Snippet</p>
                  <pre className="text-2xs font-mono p-2.5 rounded bg-[#09090b] border border-border-subtle text-secondary overflow-x-auto">
                    {leak.contextSnippet}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
