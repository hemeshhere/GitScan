import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, RefreshCw, ShieldAlert, Sliders } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Switch } from "../../components/ui/Switch";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { useApi } from "../../lib/useApi";
import { api, type Rule, type RuleProvider } from "../../lib/api";
import { cn } from "../../lib/utils";

interface OutletCtx { openCmdPalette: () => void; }

const severityColors: Record<string, string> = {
  critical: "text-critical",
  high:     "text-high",
  medium:   "text-medium",
  low:      "text-low",
};

export default function Rules() {
  const { openCmdPalette } = useOutletContext<OutletCtx>();
  const [search, setSearch] = useState("");
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [testInput, setTestInput] = useState("");
  const [localOverrides, setLocalOverrides] = useState<Record<string, { enabled?: boolean; severity?: Rule["severity"] }>>({});

  const { data: providers, loading, error, refetch } = useApi(() => api.getRules());
  const { data: stats } = useApi(() => api.getRuleStats());

  const ruleProviders = providers ?? [];

  // Compute all rules and find selected
  const allRules = useMemo(() => {
    return ruleProviders.flatMap(p => p.rules ?? []);
  }, [ruleProviders]);

  const selectedRule = useMemo(() => {
    if (!allRules.length) return null;
    const found = allRules.find(r => r.id === selectedRuleId);
    return found ?? allRules[0];
  }, [allRules, selectedRuleId]);

  const toggleRule = (id: string) => {
    const currentRule = allRules.find(r => r.id === id);
    if (!currentRule) return;
    const currentEnabled = localOverrides[id]?.enabled ?? currentRule.enabled;
    setLocalOverrides(prev => ({
      ...prev,
      [id]: { ...prev[id], enabled: !currentEnabled },
    }));
    api.updateRule(id, { enabled: !currentEnabled }).catch(() => {});
  };

  const filteredProviders = useMemo(() => {
    if (!search.trim()) return ruleProviders;
    const query = search.toLowerCase();
    return ruleProviders
      .map(p => ({
        ...p,
        rules: (p.rules ?? []).filter(r =>
          r.name.toLowerCase().includes(query) ||
          r.provider.toLowerCase().includes(query) ||
          r.id.toLowerCase().includes(query)
        ),
      }))
      .filter(p => p.rules.length > 0);
  }, [ruleProviders, search]);

  // Live test: highlight matches
  let testMatches: Array<{ start: number; end: number }> = [];
  if (testInput && selectedRule?.pattern) {
    try {
      const re = new RegExp(selectedRule.pattern, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(testInput)) !== null) {
        testMatches.push({ start: m.index, end: m.index + m[0].length });
      }
    } catch {}
  }
  const hasMatch = testMatches.length > 0;

  const totalRules = stats?.total ?? allRules.length;
  const enabledRules = stats?.enabled ?? allRules.filter(r => localOverrides[r.id]?.enabled ?? r.enabled).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Rules"
        onSearchClick={openCmdPalette}
        actions={
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={refetch} aria-label="Refresh rules">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </Button>
            {totalRules > 0 && (
              <span className="text-xs text-muted font-tabular">
                <span className="text-primary font-medium">{totalRules}</span> rules ·{" "}
                <span className="text-accent font-medium">{enabledRules}</span> enabled
              </span>
            )}
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw size={20} className="animate-spin text-muted" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
            <p className="text-sm text-muted mb-2">Could not load rules from backend.</p>
            <Button size="sm" variant="ghost" onClick={refetch}>Try again</Button>
          </div>
        ) : allRules.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-raised border border-border flex items-center justify-center mb-3">
              <ShieldAlert size={18} className="text-muted" />
            </div>
            <p className="text-sm font-medium text-primary mb-1">No detection rules loaded</p>
            <p className="text-xs text-muted max-w-sm mb-4">
              Your backend has not configured any rules yet. When your backend serves rule definitions, they will appear here.
            </p>
            <Button size="sm" variant="ghost" onClick={refetch}>
              <RefreshCw size={13} /> Check backend
            </Button>
          </div>
        ) : (
          <>
            {/* Left: provider + rule list */}
            <div className="w-64 shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
              {/* Search */}
              <div className="px-3 py-3 border-b border-border-subtle">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search rules..."
                    className="w-full h-7 pl-8 pr-3 rounded-input bg-raised border border-border text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors duration-fast"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto py-2">
                {filteredProviders.length === 0 ? (
                  <p className="text-xs text-muted px-4 py-8 text-center">No rules match "{search}"</p>
                ) : (
                  filteredProviders.map(provider => (
                    <div key={provider.name}>
                      <div className="px-3 py-1.5 flex items-center justify-between">
                        <span className="text-2xs text-muted uppercase tracking-wider font-medium">{provider.name}</span>
                        <span className="text-2xs text-muted font-tabular">{(provider.rules ?? []).length}</span>
                      </div>
                      {(provider.rules ?? []).map(rule => {
                        const isEnabled = localOverrides[rule.id]?.enabled ?? rule.enabled;
                        const isSelected = selectedRule?.id === rule.id;
                        return (
                          <button
                            key={rule.id}
                            onClick={() => setSelectedRuleId(rule.id)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 h-8 text-xs text-left transition-colors duration-fast",
                              "focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-accent",
                              isSelected
                                ? "bg-raised text-primary"
                                : "text-secondary hover:bg-raised/50 hover:text-primary"
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", severityColors[rule.severity]?.replace("text-", "bg-") ?? "bg-muted")} />
                            <span className="flex-1 truncate">{rule.name}</span>
                            {!isEnabled && <span className="text-2xs text-muted">off</span>}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: rule detail */}
            <div className="flex-1 overflow-y-auto">
              {selectedRule ? (
                <div className="px-6 py-6 max-w-[640px] space-y-6">
                  <motion.div
                    key={selectedRule.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Rule header */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant={selectedRule.severity} />
                          <span className="text-2xs text-muted font-mono">{selectedRule.provider}</span>
                        </div>
                        <h2 className="text-md font-semibold text-primary">{selectedRule.name}</h2>
                        {selectedRule.description && (
                          <p className="text-xs text-muted mt-1">{selectedRule.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={localOverrides[selectedRule.id]?.enabled ?? selectedRule.enabled}
                        onCheckedChange={() => toggleRule(selectedRule.id)}
                        id={`rule-toggle-${selectedRule.id}`}
                      />
                    </div>

                    {/* Severity selector */}
                    <div className="space-y-2">
                      <p className="text-2xs text-muted uppercase tracking-wider">Severity override</p>
                      <div className="flex gap-1.5">
                        {(["critical", "high", "medium", "low"] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => {
                              setLocalOverrides(prev => ({ ...prev, [selectedRule.id]: { ...prev[selectedRule.id], severity: s } }));
                              api.updateRule(selectedRule.id, { severity: s }).catch(() => {});
                            }}
                            className={cn(
                              "h-6 px-2.5 rounded-badge text-2xs font-medium uppercase tracking-wide border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                              (localOverrides[selectedRule.id]?.severity ?? selectedRule.severity) === s
                                ? s === "critical" ? "bg-critical-bg text-critical border-critical/30"
                                : s === "high"     ? "bg-high-bg text-high border-high/30"
                                : s === "medium"   ? "bg-medium-bg text-medium border-medium/30"
                                : "bg-low-bg text-low border-low/30"
                                : "bg-raised text-muted border-border"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pattern */}
                    {selectedRule.pattern && (
                      <div className="space-y-2">
                        <p className="text-2xs text-muted uppercase tracking-wider">Regex pattern</p>
                        <CodeBlock
                          code={selectedRule.pattern}
                          language="regex"
                          copyable
                          maxHeight="80px"
                        />
                      </div>
                    )}

                    {/* Keywords */}
                    {selectedRule.keywords && selectedRule.keywords.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-2xs text-muted uppercase tracking-wider">Keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedRule.keywords.map(kw => (
                            <code key={kw} className="text-2xs font-mono bg-raised border border-border-subtle text-secondary px-1.5 py-0.5 rounded-badge">
                              {kw}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* False positive rate */}
                    {selectedRule.falsePositiveRate && (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>False positive rate:</span>
                        <span className="text-secondary font-tabular">{selectedRule.falsePositiveRate}</span>
                      </div>
                    )}

                    {/* Test rule */}
                    <div className="space-y-2">
                      <p className="text-2xs text-muted uppercase tracking-wider">Test rule</p>
                      <textarea
                        value={testInput}
                        onChange={e => setTestInput(e.target.value)}
                        placeholder="Paste code here to test this rule live..."
                        rows={5}
                        className="w-full rounded-input border border-border bg-raised text-xs font-mono text-primary placeholder:text-muted px-3 py-2 focus:outline-none focus:border-accent resize-none transition-colors duration-fast"
                      />
                      {testInput && (
                        <div className={cn(
                          "flex items-center gap-2 text-xs px-3 py-2 rounded-input border",
                          hasMatch
                            ? "bg-critical-bg border-critical/20 text-critical"
                            : "bg-accent-dim border-accent/20 text-accent"
                        )}>
                          {hasMatch
                            ? `${testMatches.length} match${testMatches.length > 1 ? "es" : ""} found`
                            : "No matches — input looks clean"}
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {selectedRule.tags && selectedRule.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRule.tags.map(tag => (
                          <span key={tag} className="text-2xs text-muted bg-raised rounded-badge px-1.5 py-0.5 border border-border-subtle">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted">
                  Select a rule to view details
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
