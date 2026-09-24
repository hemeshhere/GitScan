import { useState } from "react";
import { Eye, EyeOff, CheckCircle2, X } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { CodeBlock, CopyableCode } from "../../components/ui/CodeBlock";
import { SidePanel } from "../../components/ui/Dialog";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { useApi } from "../../lib/useApi";
import { api, type Finding, type Severity, type Status } from "../../lib/api";
import { cn } from "../../lib/utils";

interface OutletCtx { openCmdPalette: () => void; }
type Filter = { severity: Severity[]; status: Status[]; repo: string; };
const severities: Severity[] = ["critical", "high", "medium", "low"];
const statuses: Status[] = ["open", "resolved", "false_positive"];

export default function Findings() {
  const { openCmdPalette } = useOutletContext<OutletCtx>();
  const { data, loading, error, refetch } = useApi(() => api.getFindings());
  const findings = data ?? [];

  const [filter, setFilter] = useState<Filter>({ severity: [], status: [], repo: "" });
  const [selected, setSelected] = useState<Finding | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [revealing, setRevealing] = useState(false);

  const repos = Array.from(new Set(findings.map(f => f.repo)));
  const filtered = findings.filter(f => {
    if (filter.severity.length && !filter.severity.includes(f.severity)) return false;
    if (filter.status.length && !filter.status.includes(f.status)) return false;
    if (filter.repo && f.repo !== filter.repo) return false;
    return true;
  });

  const toggleSeverity = (s: Severity) =>
    setFilter(p => ({ ...p, severity: p.severity.includes(s) ? p.severity.filter(x => x !== s) : [...p.severity, s] }));
  const toggleStatus = (s: Status) =>
    setFilter(p => ({ ...p, status: p.status.includes(s) ? p.status.filter(x => x !== s) : [...p.status, s] }));

  const doReveal = async () => {
    if (!selected) return;
    setRevealing(true);
    const res = await api.revealSecret(selected.id);
    setRevealing(false);
    if (res) { setRevealedValue(res.secret); setRevealed(true); }
    setConfirmReveal(false);
  };

  const columns: Column<Finding>[] = [
    { key: "severity",   header: "Severity", sortable: true, width: "90px",  render: r => <Badge variant={r.severity} /> },
    { key: "ruleName",   header: "Rule",     sortable: true,                  render: r => <span className="text-sm text-primary">{r.ruleName}</span> },
    { key: "file",       header: "Location",                                  render: r => <span className="font-mono text-xs text-secondary">{r.file}:<span className="text-muted">{r.line}</span></span> },
    { key: "repo",       header: "Repo",     sortable: true,                  render: r => <span className="font-mono text-xs text-secondary">{r.repo}</span> },
    { key: "author",     header: "Author",                                    render: r => <span className="text-xs text-muted">{r.author}</span> },
    { key: "commitHash", header: "Commit",                                    render: r => <CopyableCode value={r.commitHash} /> },
    { key: "age",        header: "Age",      sortable: true,                  render: r => <span className="text-xs text-muted font-tabular">{r.age}</span> },
    { key: "status",     header: "Status",   sortable: true,                  render: r => <Badge variant={r.status} /> },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Findings"
        onSearchClick={openCmdPalette}
        actions={<span className="text-xs text-muted font-tabular">{filtered.length} of {findings.length}</span>}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Filter bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-surface flex-wrap">
          <div className="flex items-center gap-1">
            {severities.map(s => (
              <button key={s} onClick={() => toggleSeverity(s)}
                className={cn(
                  "h-6 px-2 rounded-badge text-2xs font-medium uppercase tracking-wide transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent border",
                  filter.severity.includes(s)
                    ? s === "critical" ? "bg-critical-bg text-critical border-critical/30"
                    : s === "high"     ? "bg-high-bg text-high border-high/30"
                    : s === "medium"   ? "bg-medium-bg text-medium border-medium/30"
                    : "bg-low-bg text-low border-low/30"
                    : "bg-raised text-muted border-border hover:border-[#38383E]"
                )}>{s}</button>
            ))}
          </div>
          <div className="w-px h-4 bg-border mx-1" />
          <div className="flex items-center gap-1">
            {statuses.map(s => (
              <button key={s} onClick={() => toggleStatus(s)}
                className={cn(
                  "h-6 px-2 rounded-badge text-2xs font-medium capitalize transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent border",
                  filter.status.includes(s) ? "bg-raised text-primary border-accent" : "bg-raised text-muted border-border hover:border-[#38383E]"
                )}>{s.replace("_", " ")}</button>
            ))}
          </div>
          {repos.length > 0 && (
            <>
              <div className="w-px h-4 bg-border mx-1" />
              <select value={filter.repo} onChange={e => setFilter(p => ({ ...p, repo: e.target.value }))}
                className="h-6 px-2 rounded-badge text-xs bg-raised border border-border text-secondary focus:outline-none focus:border-accent transition-colors duration-fast">
                <option value="">All repos</option>
                {repos.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </>
          )}
          {(filter.severity.length || filter.status.length || filter.repo) ? (
            <button onClick={() => setFilter({ severity: [], status: [], repo: "" })}
              className="flex items-center gap-1 h-6 px-2 text-2xs text-muted hover:text-secondary transition-colors duration-fast">
              <X size={10} /> Clear
            </button>
          ) : null}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-sm text-muted mb-2">Could not load findings.</p>
              <Button size="sm" variant="ghost" onClick={refetch}>Try again</Button>
            </div>
          ) : (
            <DataTable<Finding>
              columns={columns}
              data={filtered}
              loading={loading}
              onRowClick={row => { setSelected(row); setRevealed(false); setRevealedValue(null); setConfirmReveal(false); }}
              stickyHeader
              emptyState={
                <div className="flex flex-col items-center justify-center py-20">
                  <CheckCircle2 size={32} className="text-accent mb-3" />
                  <p className="text-sm text-primary font-medium mb-1">
                    {findings.length === 0 ? "No findings yet" : "No findings match your filters"}
                  </p>
                  <p className="text-xs text-muted">
                    {findings.length === 0
                      ? "Connect a repository and push a commit to start scanning."
                      : "Adjust the filters above or clear them to see all findings."}
                  </p>
                </div>
              }
            />
          )}
        </div>
      </div>

      {/* Side panel */}
      <SidePanel open={!!selected} onClose={() => setSelected(null)} title={selected?.ruleName ?? "Finding detail"} width="600px">
        {selected && (
          <div className="divide-y divide-border-subtle">
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={selected.severity} />
                <Badge variant={selected.status} />
                <span className="text-xs text-muted font-mono">{selected.provider}</span>
              </div>
              <p className="text-sm font-medium text-primary">{selected.ruleName}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-xs text-secondary">{selected.file}:{selected.line}</span>
                <span className="text-muted">·</span>
                <span className="text-xs text-muted">{selected.repo}</span>
                <span className="text-muted">·</span>
                <CopyableCode value={selected.commitHash} />
              </div>
            </div>

            <div className="px-5 py-4 space-y-2">
              <p className="text-2xs text-muted uppercase tracking-wider font-medium">Secret value</p>
              <div className="flex items-center gap-2 bg-raised rounded-input px-3 py-2 border border-border">
                <code className="flex-1 font-mono text-xs text-secondary">
                  {revealed && revealedValue ? revealedValue : selected.secret}
                </code>
                {!revealed ? (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmReveal(true)}>
                    <Eye size={12} /> Reveal
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => { setRevealed(false); setRevealedValue(null); }}>
                    <EyeOff size={12} /> Hide
                  </Button>
                )}
              </div>
              {confirmReveal && !revealed && (
                <div className="rounded-input border border-critical/20 bg-critical-bg px-3 py-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-critical">This reveals the raw secret in your browser. Continue?</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" loading={revealing} onClick={doReveal}>Reveal</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmReveal(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>

            {selected.snippet && (
              <div className="px-5 py-4 space-y-2">
                <p className="text-2xs text-muted uppercase tracking-wider font-medium">Code context</p>
                <CodeBlock
                  code={selected.snippet}
                  language={selected.file.split(".").pop()}
                  showLineNumbers
                  highlightLines={[selected.snippetHighlightLine]}
                  maxHeight="200px"
                />
              </div>
            )}

            {selected.whyFlagged && (
              <div className="px-5 py-4 space-y-2">
                <p className="text-2xs text-muted uppercase tracking-wider font-medium">Why this was flagged</p>
                <p className="text-xs text-secondary leading-5">{selected.whyFlagged}</p>
                <div className="font-mono text-2xs text-muted bg-raised rounded-input px-3 py-2 border border-border-subtle">
                  Pattern: <span className="text-secondary">{selected.ruleId}</span>
                </div>
              </div>
            )}

            {selected.remediationSteps?.length > 0 && (
              <div className="px-5 py-4 space-y-2">
                <p className="text-2xs text-muted uppercase tracking-wider font-medium">Remediation steps</p>
                <ol className="space-y-2">
                  {selected.remediationSteps.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-xs text-secondary">
                      <span className="font-mono text-muted shrink-0 font-tabular">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="px-5 py-4 flex items-center gap-2 flex-wrap">
              <Button size="md" variant="primary" onClick={async () => { await api.resolveFinding(selected.id); refetch(); setSelected(null); }}>
                <CheckCircle2 size={14} /> Mark resolved
              </Button>
              <Button size="md" variant="secondary" onClick={async () => { await api.falsePositiveFinding(selected.id); refetch(); setSelected(null); }}>
                False positive
              </Button>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
