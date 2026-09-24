import { useState } from "react";
import { GitBranch, Plus, ExternalLink, RefreshCw } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { Drawer } from "../../components/ui/Dialog";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { useApi } from "../../lib/useApi";
import { api, type Repo } from "../../lib/api";
import { cn } from "../../lib/utils";

interface OutletCtx { openCmdPalette: () => void; }

function ProviderIcon({ provider }: { provider: Repo["provider"] }) {
  const icons: Record<Repo["provider"], string> = {
    github:    "GH",
    gitlab:    "GL",
    bitbucket: "BB",
  };
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-[3px] bg-raised border border-border text-2xs font-mono font-medium text-muted">
      {icons[provider] ?? "GIT"}
    </span>
  );
}

function RiskBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-critical" :
    score >= 60 ? "bg-high" :
    score >= 40 ? "bg-medium" :
    "bg-accent";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-raised overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-secondary font-tabular w-6">{score}</span>
    </div>
  );
}

const WEBHOOK_URL = "https://hooks.gitscan.io/v1/ingest/acme-org";
const WEBHOOK_SECRET = "whsec_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c";

const hookSnippets: Record<string, string> = {
  "pre-commit": `#!/bin/sh
# .git/hooks/pre-commit — GitScan pre-commit hook
# Install: chmod +x .git/hooks/pre-commit

GITSCAN_URL="${WEBHOOK_URL}"
GITSCAN_TOKEN="your-workspace-token"

git diff --cached --name-only | xargs -I {} sh -c '
  git show ":$1" | curl -s -X POST \\
    -H "Authorization: Bearer $GITSCAN_TOKEN" \\
    -H "X-GS-File: $1" \\
    --data-binary @- \\
    $GITSCAN_URL/scan
' -- {}`,
  "pre-push": `#!/bin/sh
# .git/hooks/pre-push — GitScan pre-push hook

GITSCAN_TOKEN="your-workspace-token"

git log @{u}..HEAD --format="%H" | while read commit; do
  git show "$commit" | curl -s -X POST \\
    -H "Authorization: Bearer $GITSCAN_TOKEN" \\
    -H "X-GS-Commit: $commit" \\
    --data-binary @- \\
    ${WEBHOOK_URL}/scan-commit
done`,
  "github-actions": `# .github/workflows/gitscan.yml
name: GitScan Scan

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Scan for secrets
        uses: gitscan/action@v2
        with:
          token: \${{ secrets.GITSCAN_TOKEN }}
          fail-on: critical,high
          slack-channel: '#security'`,
};

export default function Repositories() {
  const { openCmdPalette } = useOutletContext<OutletCtx>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<"github" | "gitlab">("github");

  const { data, loading, error, refetch } = useApi(() => api.getRepos());
  const repos = data ?? [];

  const columns: Column<Repo>[] = [
    {
      key: "name",
      header: "Repository",
      sortable: true,
      render: row => (
        <div className="flex items-center gap-2">
          <ProviderIcon provider={row.provider} />
          <span className="font-mono text-xs text-primary">{row.fullName}</span>
          {row.private && (
            <span className="text-2xs text-muted border border-border rounded-badge px-1">private</span>
          )}
        </div>
      ),
    },
    {
      key: "lastScan",
      header: "Last scan",
      sortable: true,
      render: row => <span className="text-xs text-muted font-tabular">{row.lastScan || "—"}</span>,
    },
    {
      key: "hookStatus",
      header: "Hook status",
      render: row => <Badge variant={row.hookStatus} />,
    },
    {
      key: "riskScore",
      header: "Risk score",
      sortable: true,
      render: row => <RiskBar score={row.riskScore} />,
    },
    {
      key: "openFindings",
      header: "Open findings",
      sortable: true,
      render: row => (
        <span className={cn(
          "text-xs font-tabular font-medium",
          row.openFindings > 0 ? "text-critical" : "text-muted"
        )}>
          {row.openFindings}
        </span>
      ),
    },
    {
      key: "language",
      header: "Language",
      render: row => <span className="text-xs text-muted">{row.language || "—"}</span>,
    },
  ];

  const steps = [
    "Pick provider",
    "Copy webhook URL",
    "Copy secret",
    "Install hook",
    "Send test event",
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Repositories"
        onSearchClick={openCmdPalette}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={refetch} aria-label="Refresh repositories">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </Button>
            <Button size="sm" variant="primary" onClick={() => { setDrawerOpen(true); setDrawerStep(0); }}>
              <Plus size={14} /> Connect repo
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <p className="text-sm text-muted mb-2">Could not load repositories from backend.</p>
            <Button size="sm" variant="ghost" onClick={refetch}>Try again</Button>
          </div>
        ) : (
          <div className="border-b border-border bg-surface">
            <DataTable<Repo>
              columns={columns}
              data={repos}
              loading={loading}
              stickyHeader
              emptyState={
                <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-raised border border-border flex items-center justify-center mb-3">
                    <GitBranch size={18} className="text-muted" />
                  </div>
                  <p className="text-sm font-medium text-primary mb-1">No repositories connected</p>
                  <p className="text-xs text-muted max-w-sm mb-4">
                    Connect your GitHub or GitLab repositories to automatically scan commits, pull requests, and git diffs for leaked secrets.
                  </p>
                  <Button size="sm" variant="primary" onClick={() => { setDrawerOpen(true); setDrawerStep(0); }}>
                    <Plus size={14} /> Connect repository
                  </Button>
                </div>
              }
            />
          </div>
        )}
      </div>

      {/* Connect repo drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Connect repository"
      >
        <div className="px-5 py-5 space-y-6">
          {/* Step progress */}
          <div className="flex items-center gap-0">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-0 flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-2xs font-medium font-tabular border transition-colors duration-fast",
                    i < drawerStep ? "bg-accent border-accent text-bg" :
                    i === drawerStep ? "border-accent text-accent bg-accent-dim" :
                    "border-border text-muted bg-raised"
                  )}>
                    {i < drawerStep ? "✓" : i + 1}
                  </div>
                  <span className="text-2xs text-muted mt-1 text-center w-16 leading-tight">{step}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("h-px flex-1 mx-1 -mt-4 transition-colors duration-fast", i < drawerStep ? "bg-accent" : "bg-border")} />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          {drawerStep === 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-primary">Select your Git provider</p>
              <div className="grid grid-cols-2 gap-2">
                {(["github", "gitlab"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedProvider(p)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-card border transition-colors duration-fast text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                      selectedProvider === p ? "border-accent bg-accent-dim text-primary" : "border-border text-secondary hover:border-[#38383E]"
                    )}
                  >
                    <ProviderIcon provider={p} />
                    {p === "github" ? "GitHub" : "GitLab"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {drawerStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-primary">Add the webhook URL</p>
              <p className="text-xs text-muted">In your repository settings under Webhooks, add this URL:</p>
              <CodeBlock code={WEBHOOK_URL} language="url" copyable maxHeight="60px" />
              <p className="text-xs text-muted">Set content type to <code className="font-mono text-secondary">application/json</code> and trigger on Push and Pull Request events.</p>
            </div>
          )}

          {drawerStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-primary">Add the webhook secret</p>
              <p className="text-xs text-muted">Paste this secret in the "Secret" field when creating your webhook:</p>
              <CodeBlock code={WEBHOOK_SECRET} language="secret" copyable maxHeight="60px" />
              <p className="text-xs text-muted">This is used to verify that events come from your provider.</p>
            </div>
          )}

          {drawerStep === 3 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-primary">Install the pre-commit hook</p>
              <p className="text-xs text-muted">For real-time blocking before commits reach the network, also install the local hook:</p>
              <CodeBlock code={hookSnippets["pre-commit"]} language="bash" copyable maxHeight="220px" />
            </div>
          )}

          {drawerStep === 4 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-primary">Send a test event</p>
              <p className="text-xs text-muted">Make a test push to your repository, or click "Redeliver" on the webhook in your provider settings.</p>
              <div className="rounded-card border border-accent/20 bg-accent-dim p-4">
                <p className="text-xs text-accent font-medium mb-1">Listening for events...</p>
                <p className="text-2xs text-muted">No test event received yet. Configure your backend to capture incoming webhooks.</p>
              </div>
              <Button variant="primary" size="md" className="w-full" onClick={() => setDrawerOpen(false)}>
                Done — finish setup
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setDrawerStep(s => Math.max(0, s - 1))}
              disabled={drawerStep === 0}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setDrawerStep(s => Math.min(steps.length - 1, s + 1))}
              disabled={drawerStep === steps.length - 1}
            >
              Continue
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
