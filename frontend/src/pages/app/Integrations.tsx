import { useState, useEffect } from "react";
import { Send, Eye, EyeOff, Check, RefreshCw } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { cn } from "../../lib/utils";

interface OutletCtx { openCmdPalette: () => void; }

const hookSnippets: Record<string, { code: string; lang: string }> = {
  "pre-commit": {
    lang: "bash",
    code: `#!/bin/sh
# .git/hooks/pre-commit
curl -s -X POST https://hooks.gitscan.io/v1/ingest \\
  -H "Authorization: Bearer $GITSCAN_TOKEN" \\
  --data "$(git diff --cached)"`,
  },
  "pre-push": {
    lang: "bash",
    code: `#!/bin/sh
# .git/hooks/pre-push
git log @{u}..HEAD --format="%H" | while read sha; do
  curl -s -X POST https://hooks.gitscan.io/v1/ingest \\
    -H "Authorization: Bearer $GITSCAN_TOKEN" \\
    --data "$(git show $sha)"
done`,
  },
  "github-actions": {
    lang: "yaml",
    code: `# .github/workflows/gitscan.yml
name: GitScan Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitscan/action@v2
        with:
          token: \${{ secrets.GITSCAN_TOKEN }}
          fail-on: critical,high`,
  },
};

export default function Integrations() {
  const { openCmdPalette } = useOutletContext<OutletCtx>();
  const [webhookVisible, setWebhookVisible] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channel, setChannel] = useState("");
  const [threshold, setThreshold] = useState("high");
  const [blockMode, setBlockMode] = useState(true);
  const [testSent, setTestSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: config, loading, refetch } = useApi(() => api.getIntegrationConfig());

  useEffect(() => {
    if (config) {
      setWebhookUrl(config.slackWebhookUrl ?? "");
      setChannel(config.slackChannel ?? "");
      setThreshold(config.slackThreshold ?? "high");
      setBlockMode(config.blockMode ?? true);
    }
  }, [config]);

  const saveConfig = async () => {
    setSaving(true);
    await api.saveIntegrationConfig({
      slackWebhookUrl: webhookUrl,
      slackChannel: channel,
      slackThreshold: threshold,
      blockMode,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sendTest = async () => {
    setTestSent(true);
    await api.sendTestSlackAlert();
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Integrations"
        onSearchClick={openCmdPalette}
        actions={
          <Button size="sm" variant="ghost" onClick={refetch} aria-label="Refresh integration configuration">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] px-6 py-6 space-y-8">

          {/* Block mode vs Warn mode */}
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-primary mb-0.5">Enforcement mode</h2>
              <p className="text-xs text-muted">Controls what happens when a secret is detected.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Block mode",
                  value: true,
                  desc: "Commit or push is rejected immediately. The developer must rotate the secret and remove it before continuing.",
                },
                {
                  label: "Warn mode",
                  value: false,
                  desc: "Commit proceeds but an alert is sent to Slack and the finding is logged. No interruption to the developer workflow.",
                },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setBlockMode(opt.value)}
                  className={cn(
                    "text-left p-4 rounded-card border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                    blockMode === opt.value
                      ? "border-accent bg-accent-dim"
                      : "border-border hover:border-[#38383E]"
                  )}
                >
                  <p className={cn("text-sm font-medium mb-1.5", blockMode === opt.value ? "text-accent" : "text-primary")}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-muted leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Slack integration */}
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-primary mb-0.5">Slack</h2>
              <p className="text-xs text-muted">Send alerts to a Slack channel when secrets are detected.</p>
            </div>

            <div className="space-y-3 rounded-card border border-border p-4 bg-surface">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-secondary">Incoming webhook URL</label>
                <div className="flex gap-2">
                  <Input
                    type={webhookVisible ? "text" : "password"}
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    className="flex-1"
                    placeholder="https://hooks.slack.com/services/..."
                  />
                  <Button
                    size="md"
                    variant="ghost"
                    onClick={() => setWebhookVisible(v => !v)}
                    aria-label={webhookVisible ? "Hide webhook URL" : "Show webhook URL"}
                  >
                    {webhookVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-secondary">Channel</label>
                  <Input
                    value={channel}
                    onChange={e => setChannel(e.target.value)}
                    placeholder="#security"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-secondary">Alert threshold</label>
                  <select
                    value={threshold}
                    onChange={e => setThreshold(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-input border border-border bg-surface text-sm text-secondary focus:outline-none focus:border-accent transition-colors duration-fast"
                  >
                    <option value="critical">Critical only</option>
                    <option value="high">High and above</option>
                    <option value="medium">Medium and above</option>
                    <option value="low">All findings</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  size="md"
                  variant="ghost"
                  onClick={sendTest}
                  disabled={!webhookUrl || testSent}
                >
                  <Send size={14} /> {testSent ? "Test alert sent" : "Send test alert"}
                </Button>
                <Button size="md" variant="primary" onClick={saveConfig} disabled={saving}>
                  {saved ? (
                    <>
                      <Check size={14} className="text-accent" /> Saved
                    </>
                  ) : saving ? (
                    "Saving..."
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </section>

          {/* Git hooks install */}
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-primary mb-0.5">Git hooks</h2>
              <p className="text-xs text-muted">Scan commits locally before they leave the machine.</p>
            </div>

            <Tabs defaultValue="pre-commit">
              <TabsList>
                <TabsTrigger value="pre-commit">pre-commit</TabsTrigger>
                <TabsTrigger value="pre-push">pre-push</TabsTrigger>
                <TabsTrigger value="github-actions">GitHub Actions</TabsTrigger>
              </TabsList>
              {Object.entries(hookSnippets).map(([key, val]) => (
                <TabsContent key={key} value={key} className="pt-3">
                  <CodeBlock code={val.code} language={val.lang} maxHeight="240px" />
                </TabsContent>
              ))}
            </Tabs>
          </section>
        </div>
      </div>
    </div>
  );
}
