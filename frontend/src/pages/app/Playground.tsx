import { useState, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Trash2 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { scanText, type ScanMatch } from "../../lib/patterns";
import { cn } from "../../lib/utils";

interface OutletCtx { openCmdPalette: () => void; }

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const update = useCallback((v: T) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(v), ms);
  }, [ms]);

  // Re-trigger on value change
  useMemo(() => update(value), [value, update]);

  return debounced;
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

export default function Playground() {
  const { openCmdPalette } = useOutletContext<OutletCtx>();
  const [code, setCode] = useState("");

  const debouncedCode = useDebounce(code, 300);
  const matches = useMemo(() => scanText(debouncedCode), [debouncedCode]);
  const sorted = [...matches].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Highlight: split code into segments
  const segments = useMemo(() => {
    if (!debouncedCode || matches.length === 0) return [{ text: debouncedCode, highlighted: false }];
    const result: Array<{ text: string; highlighted: boolean; severity?: string }> = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.matchStart > cursor) result.push({ text: debouncedCode.slice(cursor, m.matchStart), highlighted: false });
      result.push({ text: debouncedCode.slice(m.matchStart, m.matchEnd), highlighted: true, severity: m.severity });
      cursor = m.matchEnd;
    }
    if (cursor < debouncedCode.length) result.push({ text: debouncedCode.slice(cursor), highlighted: false });
    return result;
  }, [debouncedCode, matches]);

  const highlightBg: Record<string, string> = {
    critical: "bg-critical/20 text-critical",
    high:     "bg-high/20 text-high",
    medium:   "bg-medium/20 text-medium",
    low:      "bg-low/20 text-low",
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Playground"
        onSearchClick={openCmdPalette}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCode("")} disabled={!code}>
              <Trash2 size={12} /> Clear
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Editor pane */}
        <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface">
            <span className="text-2xs text-muted uppercase tracking-wider">Input</span>
            <span className="text-2xs text-muted font-tabular">{code.split("\n").length} lines</span>
          </div>
          <div className="flex-1 relative overflow-hidden">
            {/* Highlight overlay */}
            <div
              aria-hidden="true"
              className="absolute inset-0 p-4 font-mono text-xs leading-6 whitespace-pre-wrap break-all pointer-events-none text-transparent overflow-hidden"
            >
              {segments.map((seg, i) => (
                <span
                  key={i}
                  className={cn(
                    "rounded-sm",
                    seg.highlighted && seg.severity ? highlightBg[seg.severity] : ""
                  )}
                >
                  {seg.text}
                </span>
              ))}
            </div>
            {/* Actual textarea */}
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              placeholder="Paste code or a git diff here to scan for secrets..."
              className="absolute inset-0 w-full h-full p-4 font-mono text-xs leading-6 bg-bg text-primary placeholder:text-muted resize-none focus:outline-none border-none caret-accent"
              style={{ caretColor: "var(--accent)", background: "transparent" }}
              aria-label="Code input for secret scanning"
            />
          </div>
        </div>

        {/* Results pane */}
        <div className="w-80 shrink-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface">
            <span className="text-2xs text-muted uppercase tracking-wider">Detections</span>
            <span className={cn(
              "text-2xs font-tabular font-medium",
              sorted.length > 0 ? "text-critical" : "text-accent"
            )}>
              {sorted.length === 0 ? (code ? "Clean" : "—") : `${sorted.length} found`}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                {code ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-accent-dim flex items-center justify-center mb-3">
                      <span className="text-accent text-lg">✓</span>
                    </div>
                    <p className="text-sm text-primary font-medium mb-1">No secrets detected</p>
                    <p className="text-xs text-muted">Scanned {code.split("\n").length} lines against 10 patterns.</p>
                  </>
                ) : (
                  <p className="text-xs text-muted">Paste code on the left to scan it.</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {sorted.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.03 }}
                    className="px-4 py-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={m.severity} />
                      <span className="text-2xs text-muted font-tabular">L{m.line}:{m.col}</span>
                    </div>
                    <p className="text-xs text-primary font-medium">{m.patternName}</p>
                    <p className="text-2xs text-muted">{m.provider}</p>
                    <code className="block text-2xs font-mono text-secondary bg-raised rounded px-2 py-1 border border-border-subtle truncate">
                      {m.masked}
                    </code>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
