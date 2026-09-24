import { useState, useEffect } from "react";
import { AlertTriangle, Eye, EyeOff, Plus, Trash2, Check, RefreshCw } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Switch } from "../../components/ui/Switch";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { cn } from "../../lib/utils";

interface OutletCtx { openCmdPalette: () => void; }

function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="pb-4 mb-4 border-b border-border-subtle">
      <h2 className="text-sm font-semibold text-primary">{title}</h2>
      {desc && <p className="text-xs text-muted mt-0.5">{desc}</p>}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-secondary">{label}</label>
      {children}
      {hint && <p className="text-2xs text-muted">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const { openCmdPalette } = useOutletContext<OutletCtx>();
  const [workspace, setWorkspace] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [allowPaths, setAllowPaths] = useState<string[]>([]);
  const [ignoreComment, setIgnoreComment] = useState("gitscan:ignore");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackDigest, setSlackDigest] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: settingsData, loading, refetch } = useApi(() => api.getSettings());

  useEffect(() => {
    if (settingsData) {
      setWorkspace(settingsData.workspaceName ?? "");
      setDefaultBranch(settingsData.defaultBranch ?? "main");
      setAllowPaths(settingsData.allowPaths ?? []);
      setIgnoreComment(settingsData.ignoreComment ?? "gitscan:ignore");
      setEmailAlerts(settingsData.emailAlerts ?? true);
      setSlackDigest(settingsData.slackDigest ?? false);
      setApiKey(settingsData.apiKey ?? "");
    }
  }, [settingsData]);

  const addPath = () => {
    if (newPath.trim()) {
      setAllowPaths(p => [...p, newPath.trim()]);
      setNewPath("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await api.saveSettings({
      workspaceName: workspace,
      defaultBranch,
      allowPaths,
      ignoreComment,
      emailAlerts,
      slackDigest,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Settings"
        onSearchClick={openCmdPalette}
        actions={
          <Button size="sm" variant="ghost" onClick={refetch} aria-label="Refresh settings">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] px-6 py-6 space-y-10">

          {/* Workspace */}
          <section>
            <SectionHeader title="Workspace" desc="General settings for your GitScan workspace." />
            <div className="space-y-4">
              <Field label="Workspace name">
                <Input
                  value={workspace}
                  onChange={e => setWorkspace(e.target.value)}
                  placeholder="e.g. acme-corp"
                  className="max-w-[320px]"
                />
              </Field>
              <Field label="Default branch" hint="Pushes to this branch trigger immediate Slack alerts.">
                <Input
                  value={defaultBranch}
                  onChange={e => setDefaultBranch(e.target.value)}
                  className="max-w-[160px]"
                />
              </Field>
              <Button size="md" variant="secondary" onClick={handleSave} disabled={saving}>
                {saved ? (
                  <>
                    <Check size={14} className="text-accent" /> Saved
                  </>
                ) : saving ? (
                  "Saving..."
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </section>

          {/* Allowlists */}
          <section>
            <SectionHeader title="Allowlists" desc="Paths and patterns that GitScan will never block." />
            <div className="space-y-4">
              <Field label="Ignored path patterns" hint="Glob patterns. Matches are not scanned.">
                <div className="space-y-1.5">
                  {allowPaths.length === 0 ? (
                    <p className="text-xs text-muted italic py-1">No custom ignored paths defined.</p>
                  ) : (
                    allowPaths.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <code className="flex-1 h-8 flex items-center px-3 bg-raised border border-border rounded-input text-xs font-mono text-secondary">
                          {p}
                        </code>
                        <button
                          onClick={() => setAllowPaths(prev => prev.filter((_, j) => j !== i))}
                          aria-label={`Remove ${p}`}
                          className="text-muted hover:text-critical transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                  <div className="flex gap-2 pt-1">
                    <Input
                      value={newPath}
                      onChange={e => setNewPath(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addPath()}
                      placeholder="e.g. src/mocks/**"
                      className="flex-1"
                    />
                    <Button size="md" variant="secondary" onClick={addPath}>
                      <Plus size={14} /> Add
                    </Button>
                  </div>
                </div>
              </Field>

              <Field label="Ignore comment" hint="Add this comment on the same line to suppress a specific finding.">
                <div className="flex items-center gap-2 max-w-[320px]">
                  <code className="text-xs text-muted">// </code>
                  <Input
                    value={ignoreComment}
                    onChange={e => setIgnoreComment(e.target.value)}
                  />
                </div>
              </Field>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <SectionHeader title="Notifications" desc="When and how you want to be notified." />
            <div className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm text-primary">Email alerts</p>
                  <p className="text-2xs text-muted">Immediate email on critical findings.</p>
                </div>
                <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} id="notif-email" />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm text-primary">Slack daily digest</p>
                  <p className="text-2xs text-muted">Summary of all findings at 9am.</p>
                </div>
                <Switch checked={slackDigest} onCheckedChange={setSlackDigest} id="notif-slack-digest" />
              </div>
            </div>
          </section>

          {/* API Keys */}
          <section>
            <SectionHeader title="API keys" desc="Use these to authenticate the GitScan CLI and GitHub Actions." />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <code className={cn(
                  "flex-1 h-8 flex items-center px-3 bg-raised border border-border rounded-input text-xs font-mono text-secondary overflow-hidden",
                  !apiKey && "italic text-muted"
                )}>
                  {!apiKey
                    ? "No API key configured"
                    : showKey
                    ? apiKey
                    : apiKey.slice(0, 10) + "•".repeat(24)}
                </code>
                {apiKey && (
                  <Button
                    size="md"
                    variant="ghost"
                    onClick={() => setShowKey(v => !v)}
                    aria-label={showKey ? "Hide API key" : "Reveal API key"}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                )}
              </div>
              <p className="text-2xs text-muted">API key is provisioned and managed by your backend environment.</p>
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <div className="pb-4 mb-4 border-b border-critical/20">
              <h2 className="text-sm font-semibold text-critical">Danger zone</h2>
              <p className="text-xs text-muted mt-0.5">These actions are permanent and cannot be undone.</p>
            </div>
            <div className="rounded-card border border-critical/20 bg-critical-bg p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-primary mb-0.5">Delete workspace</p>
                <p className="text-xs text-muted mb-3">
                  Removes all repositories, findings, and rules. Data is permanently erased within 24 hours.
                </p>
                <Field label={`Type "${workspace || "delete"}" to confirm`}>
                  <Input
                    value={dangerConfirm}
                    onChange={e => setDangerConfirm(e.target.value)}
                    placeholder={workspace || "delete"}
                    className="max-w-[240px] border-critical/30 focus:border-critical"
                  />
                </Field>
              </div>
              <Button
                variant="danger"
                size="md"
                disabled={!dangerConfirm || dangerConfirm !== (workspace || "delete")}
              >
                <AlertTriangle size={14} /> Delete workspace
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
