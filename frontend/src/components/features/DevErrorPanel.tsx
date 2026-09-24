// ─── Hidden Dev Error Trigger Panel ──────────────────────────────────────────
// Only mounted when import.meta.env.DEV is true. Allows 1-click testing of all error scenarios.

import { useState } from "react";
import { Bug, X, Play, Copy, Check } from "lucide-react";
import { mockAdapter } from "../../api/mockAdapter";

interface Scenario {
  name: string;
  code: string;
  url: string;
  desc: string;
}

const SCENARIOS: Scenario[] = [
  { name: "Invalid URL", code: "INVALID_URL", url: "github.com/invalid", desc: "400 malformed link" },
  { name: "Not Found", code: "REPO_NOT_FOUND", url: "github.com/gitscan/notfound", desc: "404 repository not found" },
  { name: "Private Repo", code: "PRIVATE_REPO", url: "github.com/gitscan/private", desc: "403 needs access token" },
  { name: "Bad Token", code: "UNAUTHORIZED_TOKEN", url: "github.com/gitscan/badtoken", desc: "401 invalid PAT token" },
  { name: "Empty Repo", code: "EMPTY_REPO", url: "github.com/gitscan/empty", desc: "0 commits to scan" },
  { name: "Rate Limited", code: "RATE_LIMITED", url: "github.com/gitscan/ratelimit", desc: "429 with 15s retry countdown" },
  { name: "Too Large", code: "TOO_LARGE", url: "github.com/gitscan/large", desc: "413 exceeds scan payload" },
  { name: "Timeout", code: "TIMEOUT", url: "github.com/gitscan/timeout", desc: "15s timeout abort" },
  { name: "Offline", code: "NETWORK_OFFLINE", url: "github.com/gitscan/offline", desc: "Fetch network failure" },
  { name: "Server Error", code: "SERVER_ERROR", url: "github.com/gitscan/server", desc: "500 internal worker failure" },
  { name: "Stalled Scan", code: "TIMEOUT (stall)", url: "github.com/gitscan/stall", desc: "Stalls at 35% for >45s" },
  { name: "Fail at 60%", code: "SCAN_FAILED", url: "github.com/gitscan/failmid", desc: "Fails mid-scan at 60%" },
  { name: "Bad Report", code: "SERVER_ERROR (zod)", url: "github.com/gitscan/badreport", desc: "Fails Zod report schema" },
  { name: "Clean Repo", code: "SUCCESS (0 leaks)", url: "github.com/facebook/react", desc: "0 secrets found" },
  { name: "Leaks Found", code: "SUCCESS (3 leaks)", url: "github.com/gitscan/leaks", desc: "3 secrets found" },
];

export function DevErrorPanel() {
  if (!import.meta.env.DEV) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleSelect = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1800);

    // Also look for any repo input on the page and populate it
    const input = document.querySelector('input[placeholder*="github.com"]') as HTMLInputElement | null;
    if (input) {
      input.value = url;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans text-xs">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="h-8 px-3 rounded-full bg-raised border border-border text-secondary hover:text-primary hover:border-accent shadow-md flex items-center gap-1.5 transition-colors duration-fast"
          title="Open GitScan Error Test Scenarios"
        >
          <Bug size={13} className="text-accent" />
          <span className="font-mono text-2xs font-medium">Dev Scenarios</span>
        </button>
      ) : (
        <div className="w-80 rounded-card border border-border bg-[#0e0e11] shadow-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-1.5">
              <Bug size={14} className="text-accent" />
              <span className="font-semibold text-primary">Error Scenarios</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted hover:text-primary p-0.5 rounded"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-2xs text-muted">
            Click any test case to populate the repository scanner input with its trigger keyword:
          </p>

          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {SCENARIOS.map(sc => (
              <button
                key={sc.name}
                onClick={() => handleSelect(sc.url)}
                className="w-full text-left p-2 rounded-input border border-border-subtle bg-surface hover:bg-raised hover:border-accent/40 transition-colors duration-fast flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-primary text-xs">{sc.name}</span>
                    <span className="text-2xs font-mono text-muted">[{sc.code}]</span>
                  </div>
                  <p className="text-2xs text-muted">{sc.desc}</p>
                </div>
                <div className="text-muted group-hover:text-accent shrink-0 ml-2">
                  {copiedUrl === sc.url ? <Check size={13} className="text-accent" /> : <Play size={11} />}
                </div>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-border-subtle text-center">
            <span className="text-2xs text-muted">Visible in local development only</span>
          </div>
        </div>
      )}
    </div>
  );
}
