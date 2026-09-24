// ─── API Service Layer ───────────────────────────────────────────────────────
// Point BASE_URL at your backend. All fetch calls go through these functions.
// Backed by the GitScan security scanner API.

export const CANDIDATE_URLS = [
  ((import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL),
  "http://localhost:8000/api",
  "http://localhost:5000/api",
].filter(Boolean) as string[];

let activeBaseUrl = CANDIDATE_URLS[0];

export const getBaseUrl = () => activeBaseUrl;
export const BASE_URL = CANDIDATE_URLS[0];

async function fetchWithFallback(path: string, options: RequestInit): Promise<Response> {
  try {
    const res = await fetch(`${activeBaseUrl}${path}`, options);
    return res;
  } catch (err) {
    for (const alt of CANDIDATE_URLS) {
      if (alt !== activeBaseUrl) {
        try {
          const res = await fetch(`${alt}${path}`, options);
          activeBaseUrl = alt;
          return res;
        } catch {
          // continue fallback
        }
      }
    }
    throw err;
  }
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetchWithFallback(path, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function post<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetchWithFallback(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function patch<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetchWithFallback(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── GitScan Backend Types ───────────────────────────────────────────────────

export interface DashboardStats {
  totalScans: number;
  leaksFound: number;
}

export interface LeakItem {
  _id?: string;
  commitId?: string;
  file: string;
  lineNumber: number;
  ruleId: string;
  ruleName: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  maskedSecret: string;
  contextSnippet?: string;
}

export interface ScanItem {
  _id: string;
  repository: string;
  commitId: string;
  authorEmail: string;
  status: "CLEAN" | "LEAK_DETECTED";
  scannedAt: string;
  leaks: LeakItem[];
}

export interface HistoricalScanResponse {
  success: boolean;
  message: string;
  leaksFound: number;
  leaks: LeakItem[];
}

export interface StatsResponse {
  success: boolean;
  data: DashboardStats;
}

export interface ScansResponse {
  success: boolean;
  count: number;
  data: ScanItem[];
}

// ─── Legacy / Compatibility Types ───────────────────────────────────────────

export type Severity = "critical" | "high" | "medium" | "low";
export type Status = "open" | "resolved" | "false_positive";
export type HookStatus = "installed" | "webhook_only" | "not_connected";
export type Provider = "github" | "gitlab" | "bitbucket";

export interface Finding {
  id: string;
  severity: Severity;
  ruleName: string;
  ruleId: string;
  file: string;
  line: number;
  repo: string;
  repoId: string;
  author: string;
  authorEmail: string;
  commitHash: string;
  branch: string;
  secret: string;
  snippet: string;
  snippetHighlightLine: number;
  whyFlagged: string;
  remediationSteps: string[];
  age: string;
  ageMs: number;
  status: Status;
  provider: string;
}

export interface Repo {
  id: string;
  name: string;
  fullName: string;
  provider: Provider;
  lastScan: string;
  lastScanMs: number;
  hookStatus: HookStatus;
  riskScore: number;
  openFindings: number;
  defaultBranch: string;
  private: boolean;
  language: string;
}

export interface Rule {
  id: string;
  name: string;
  severity: Severity;
  provider: string;
  enabled: boolean;
  pattern: string;
  keywords: string[];
  description: string;
  falsePositiveRate: string;
  tags: string[];
}

export interface RuleProvider {
  name: string;
  count: number;
  enabledCount: number;
  rules: Rule[];
}

export interface DayStat {
  date: string;
  scans: number;
  blocked: number;
  clean: number;
}

export interface LiveEvent {
  id: string;
  repo: string;
  branch: string;
  author: string;
  rule: string;
  severity: Severity | null;
  status: "blocked" | "clean";
  commitHash: string;
  time: string;
}

export interface OverviewStats {
  scansToday: number;
  scansDelta: number;
  leaksBlocked: number;
  leaksDelta: number;
  openFindings: number;
  findingsDelta: number;
  meanTimeToResolve: string;
  mttrDelta: number;
}

export interface SeverityBreakdown {
  severity: string;
  count: number;
  pct: number;
}

export interface RuleStats {
  total: number;
  enabled: number;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const api = {
  // GitScan Core Endpoints
  getStats: async (): Promise<DashboardStats | null> => {
    const res = await get<StatsResponse>("/stats");
    return res?.data ?? null;
  },

  getScans: async (): Promise<ScanItem[] | null> => {
    const res = await get<ScansResponse>("/scans");
    return res?.data ?? null;
  },

  scanRepo: async (owner: string, repo: string): Promise<HistoricalScanResponse | null> => {
    return await post<HistoricalScanResponse>("/scan-repo", { owner, repo });
  },

  // Legacy / UI compatibility stubs
  getOverviewStats:     () => get<OverviewStats>("/overview/stats"),
  getActivityData:      () => get<DayStat[]>("/overview/activity"),
  getSeverityBreakdown: () => get<SeverityBreakdown[]>("/overview/severity-breakdown"),
  getLiveFeed:          () => get<LiveEvent[]>("/overview/live-feed"),
  getFindings: async (): Promise<Finding[] | null> => {
    const direct = await get<Finding[]>("/findings");
    if (direct && direct.length > 0) return direct;

    const scansRes = await get<ScansResponse>("/scans");
    if (scansRes?.data) {
      const allFindings: Finding[] = [];
      for (const scan of scansRes.data) {
        if (scan.leaks) {
          for (const leak of scan.leaks) {
            allFindings.push({
              id: leak._id || Math.random().toString(36).slice(2, 9),
              severity: (leak.severity?.toLowerCase() === "critical" ? "critical" : leak.severity?.toLowerCase() === "high" ? "high" : leak.severity?.toLowerCase() === "medium" ? "medium" : "low") as Severity,
              ruleName: leak.ruleName || "Exposed Secret",
              ruleId: leak.ruleId || "SECRET",
              file: leak.file,
              line: Number(leak.lineNumber) || 1,
              repo: scan.repository,
              repoId: scan.repository,
              author: scan.authorEmail?.split("@")[0] || "committer",
              authorEmail: scan.authorEmail || "",
              commitHash: scan.commitId || "",
              branch: "main",
              secret: leak.maskedSecret || "********",
              snippet: leak.contextSnippet || `Found at: ${leak.file}`,
              snippetHighlightLine: Number(leak.lineNumber) || 1,
              whyFlagged: `${leak.ruleName} detected in ${leak.file}.`,
              remediationSteps: [
                "Rotate the exposed secret immediately.",
                "Remove the file or secret from the git repository.",
                "Add the file to .gitignore.",
              ],
              age: new Date(scan.scannedAt).toLocaleDateString(),
              ageMs: new Date(scan.scannedAt).getTime() || Date.now(),
              status: "open",
              provider: "github",
            });
          }
        }
      }
      return allFindings;
    }
    return null;
  },
  getFinding:           (id: string) => get<Finding>(`/findings/${id}`),
  resolveFinding:       (id: string) => patch<Finding>(`/findings/${id}/resolve`),
  falsePositiveFinding: (id: string) => patch<Finding>(`/findings/${id}/false-positive`),
  revealSecret:         (id: string) => get<{ secret: string }>(`/findings/${id}/reveal`),
  getRepos: async (): Promise<Repo[]> => {
    try {
      const scansRes = await api.getScans();
      if (!scansRes || scansRes.length === 0) return [];

      const repoMap = new Map<string, {
        name: string;
        activeSecrets: number;
        scansCount: number;
        lastScanTime: number;
        lastScanDate: string;
        hasLeaks: boolean;
      }>();

      for (const scan of scansRes) {
        const repoName = scan.repository || "unknown/repo";
        const current = repoMap.get(repoName) || {
          name: repoName,
          activeSecrets: 0,
          scansCount: 0,
          lastScanTime: 0,
          lastScanDate: scan.scannedAt,
          hasLeaks: false,
        };
        current.scansCount++;
        const scanTime = new Date(scan.scannedAt).getTime() || 0;
        if (scanTime > current.lastScanTime) {
          current.lastScanTime = scanTime;
          current.lastScanDate = scan.scannedAt;
        }
        if (scan.status === "LEAK_DETECTED") {
          current.hasLeaks = true;
          current.activeSecrets += scan.leaks?.length ?? 1;
        }
        repoMap.set(repoName, current);
      }

      return Array.from(repoMap.values()).map(r => ({
        id: r.name,
        name: r.name.split("/")[1] || r.name,
        fullName: r.name,
        provider: "github" as Provider,
        defaultBranch: "main",
        hookStatus: (r.hasLeaks ? "installed" : "webhook_only") as HookStatus,
        lastScan: new Date(r.lastScanDate).toLocaleDateString(),
        lastScanMs: r.lastScanTime,
        riskScore: Math.min(100, r.activeSecrets * 25),
        openFindings: r.activeSecrets,
        private: false,
        language: "JavaScript/TypeScript",
      }));
    } catch {
      return [];
    }
  },
  connectRepo:          (body: { provider: string; fullName: string }) => post<Repo>("/repos", body),
  sendTestEvent:        (repoId: string) => post<{ ok: boolean }>(`/repos/${repoId}/test-event`),
  getRules: async (): Promise<RuleProvider[]> => {
    return [
      {
        name: "AWS",
        count: 1,
        enabledCount: 1,
        rules: [
          {
            id: "AWS_ACCESS_KEY",
            name: "AWS Access Key ID",
            description: "Detects exposed AWS Access Key IDs (AKIA prefix)",
            severity: "critical",
            provider: "AWS",
            enabled: true,
            pattern: "AKIA[0-9A-Z]{16}",
            keywords: ["AKIA", "AWS", "KEY"],
            falsePositiveRate: "< 0.01%",
            tags: ["cloud", "iam"],
          },
        ],
      },
      {
        name: "GitHub",
        count: 1,
        enabledCount: 1,
        rules: [
          {
            id: "GITHUB_PAT",
            name: "GitHub Personal Access Token",
            description: "Detects exposed GitHub Personal Access Tokens (ghp_ prefix)",
            severity: "critical",
            provider: "GitHub",
            enabled: true,
            pattern: "ghp_[a-zA-Z0-9]{36}",
            keywords: ["ghp_", "GITHUB"],
            falsePositiveRate: "< 0.01%",
            tags: ["vcs", "token"],
          },
        ],
      },
      {
        name: "Slack",
        count: 1,
        enabledCount: 1,
        rules: [
          {
            id: "SLACK_BOT_TOKEN",
            name: "Slack Bot Token",
            description: "Detects exposed Slack Bot Tokens (xoxb- prefix)",
            severity: "high",
            provider: "Slack",
            enabled: true,
            pattern: "xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}",
            keywords: ["xoxb", "SLACK"],
            falsePositiveRate: "< 0.05%",
            tags: ["chat", "bot"],
          },
        ],
      },
      {
        name: "Stripe",
        count: 1,
        enabledCount: 1,
        rules: [
          {
            id: "STRIPE_SECRET_KEY",
            name: "Stripe Secret Key",
            description: "Detects exposed Stripe Secret API Keys (sk_live / sk_test)",
            severity: "high",
            provider: "Stripe",
            enabled: true,
            pattern: "sk_(live|test)_[0-9a-zA-Z]{24,34}",
            keywords: ["sk_live", "sk_test", "STRIPE"],
            falsePositiveRate: "< 0.02%",
            tags: ["payments", "billing"],
          },
        ],
      },
      {
        name: "Filesystem",
        count: 1,
        enabledCount: 1,
        rules: [
          {
            id: "BANNED_FILE_TYPE",
            name: "Environment or Key File Committed",
            description: "Deep tree scanning blocks .env, .pem, and .key files across the entire repo tree",
            severity: "critical",
            provider: "Filesystem",
            enabled: true,
            pattern: ".*\\.(env|pem|key)$",
            keywords: [".env", ".pem", ".key"],
            falsePositiveRate: "< 0.01%",
            tags: ["filesystem", "keys"],
          },
        ],
      },
    ];
  },
  getRuleStats:         () => get<RuleStats>("/rules/stats"),
  updateRule:           (id: string, body: Partial<Rule>) => patch<Rule>(`/rules/${id}`, body),
  getIntegrationConfig: () => get<{ slackWebhookUrl: string; slackChannel: string; slackThreshold: string; blockMode: boolean }>("/integrations"),
  saveIntegrationConfig:(body: unknown) => post<{ ok: boolean }>("/integrations", body),
  sendTestSlackAlert:   () => post<{ ok: boolean }>("/integrations/slack/test"),
  getSettings:          () => get<{ workspaceName: string; defaultBranch: string; allowPaths: string[]; ignoreComment: string; emailAlerts: boolean; slackDigest: boolean; apiKey: string }>("/settings"),
  saveSettings:         (body: unknown) => post<{ ok: boolean }>("/settings", body),
};

// Re-exports for scan client and errors
export { apiClient } from "../api/client";
export { AppError, normalizeError, type ErrorCode } from "./errors";
