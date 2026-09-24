// ─── Mock Scanner Engine & Live Public GitHub Scanner ────────────────────────
// Provides deterministic test scenarios via keywords AND performs real live
// scanning of publicly accessible GitHub repositories when no mock keyword is active.

import { AppError } from "../lib/errors";
import { parseRepoUrl } from "../lib/parseRepoUrl";
import { scanText } from "../lib/patterns";
import type { ScanFinding } from "./client";

export interface MockScanSession {
  scanId: string;
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  token?: string;
  keyword?: string;
  createdAt: number;
  lastProgressUpdate: number;
  progress: number;
  filesScanned: number;
  totalFiles: number;
  matchesFound: number;
  stalled: boolean;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  realFindings?: ScanFinding[];
  liveScanDone?: boolean;
}

const mockSessions = new Map<string, MockScanSession>();

// Extracted keyword from URL or input for dev testing scenarios
export function extractTriggerKeyword(url: string): string | null {
  const lower = url.toLowerCase();
  const keywords = [
    "invalid",
    "notfound",
    "private",
    "badtoken",
    "empty",
    "ratelimit",
    "large",
    "timeout",
    "offline",
    "server",
    "stall",
    "failmid",
    "badreport",
    "leaks",
  ];
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      return kw;
    }
  }
  return null;
}

const HIGH_RISK_CANDIDATE_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.staging",
  ".env.test",
  "config.env",
  "prod.env",
  "poem.py",
  "config.py",
  "settings.py",
  "app.py",
  "server.js",
  "index.js",
  "index.html",
  "src/config.ts",
  "src/config.js",
  "src/index.ts",
  "package.json",
  "requirements.txt",
  "config.json",
  "credentials.json",
  "docker-compose.yml",
  "Dockerfile",
  "README.md",
];

async function performLiveGitHubScan(session: MockScanSession): Promise<ScanFinding[]> {
  const { owner, repo, branch } = session;
  const branches = [branch, "main", "master"].filter((v, i, a) => a.indexOf(v) === i);
  const findings: ScanFinding[] = [];
  let foundAnyFiles = false;

  for (const b of branches) {
    if (session.status === "cancelled") break;

    // Check high risk files in parallel
    const checks = HIGH_RISK_CANDIDATE_FILES.map(async file => {
      if (session.status === "cancelled") return;
      try {
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${file}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const text = await res.text();
        if (!text || text.includes("404: Not Found") || text.startsWith("<!DOCTYPE html>")) {
          return;
        }

        foundAnyFiles = true;
        session.filesScanned++;

        const matches = scanText(text);
        const lines = text.split("\n");

        for (const m of matches) {
          const rawLine = lines[m.line - 1] ?? m.masked;
          findings.push({
            id: `f-${Math.random().toString(36).slice(2, 9)}`,
            severity: m.severity,
            ruleName: m.patternName,
            ruleId: m.patternId,
            file,
            line: m.line,
            secret: m.masked,
            snippet: rawLine.trim(),
            snippetHighlightLine: m.line,
            whyFlagged: `${m.patternName} detected in publicly exposed ${file}.`,
            remediationSteps: [
              `Immediately revoke and rotate this ${m.patternName}.`,
              `Do not commit secrets or ${file} to public repositories. Add it to .gitignore.`,
              `Remove this file from your git commit history using git filter-repo or BFG Repo-Cleaner.`,
            ],
          });
        }

        // Special rule for .env files: If it's an environment file with variable assignments,
        // flag active assignments even if no standard provider signature matched.
        if (file.startsWith(".env") && matches.length === 0) {
          lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
              const eqIdx = trimmed.indexOf("=");
              const key = trimmed.slice(0, eqIdx).trim();
              const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
              if (val.length > 5 && !val.includes("your_") && !val.includes("example")) {
                findings.push({
                  id: `f-${Math.random().toString(36).slice(2, 9)}`,
                  severity: "critical",
                  ruleName: "Exposed Environment Configuration",
                  ruleId: "exposed-env-config",
                  file,
                  line: idx + 1,
                  secret: `${key}=${val.slice(0, 3)}****${val.slice(-3)}`,
                  snippet: trimmed,
                  snippetHighlightLine: idx + 1,
                  whyFlagged: `Publicly committed .env file contains active configuration credential for ${key}.`,
                  remediationSteps: [
                    "Delete this .env file from the repository immediately.",
                    "Add .env to your .gitignore.",
                    "Rotate any credentials that were exposed to the public.",
                  ],
                });
              }
            }
          });
        }
      } catch {
        // ignore probe error
      }
    });

    await Promise.all(checks);
    if (foundAnyFiles) break;
  }

  session.liveScanDone = true;
  session.realFindings = findings;
  session.matchesFound = findings.length;
  return findings;
}

export const mockAdapter = {
  extractTriggerKeyword,
  forceKeyword: null as string | null,

  setForcedKeyword(kw: string | null) {
    this.forceKeyword = kw;
  },

  async startScan(repoUrl: string, token?: string): Promise<{ scanId: string; status: "queued" }> {
    const keyword = this.forceKeyword || extractTriggerKeyword(repoUrl);

    // Immediate triggers on startScan
    if (keyword === "invalid") {
      throw new AppError({
        code: "INVALID_URL",
        message: "The repository URL is invalid or malformed.",
        status: 400,
      });
    }

    if (keyword === "notfound") {
      throw new AppError({
        code: "REPO_NOT_FOUND",
        message: "We couldn't find that repository. Check the spelling, or it may be private.",
        status: 404,
      });
    }

    if (keyword === "private" && !token) {
      throw new AppError({
        code: "PRIVATE_REPO",
        message: "This repository is private. Add an access token to scan it.",
        status: 403,
      });
    }

    if (keyword === "badtoken" || (keyword === "private" && token === "bad_token")) {
      throw new AppError({
        code: "UNAUTHORIZED_TOKEN",
        message: "The access token provided is invalid or lacks repository access.",
        status: 401,
      });
    }

    if (keyword === "empty") {
      throw new AppError({
        code: "EMPTY_REPO",
        message: "This repository has no commits to scan.",
        status: 200,
      });
    }

    if (keyword === "ratelimit") {
      throw new AppError({
        code: "RATE_LIMITED",
        message: "Too many scans right now. You can retry in 15s.",
        status: 429,
        retryAfterSeconds: 15,
      });
    }

    if (keyword === "large") {
      throw new AppError({
        code: "TOO_LARGE",
        message: "This repository is too large to scan in full. Try scanning the latest commit only.",
        status: 413,
      });
    }

    if (keyword === "timeout") {
      await new Promise(resolve => setTimeout(resolve, 16000));
      throw new AppError({
        code: "TIMEOUT",
        message: "The connection to GitHub timed out.",
        status: 504,
      });
    }

    if (keyword === "offline") {
      throw new AppError({
        code: "NETWORK_OFFLINE",
        message: "You appear to be offline. We'll retry when you reconnect.",
      });
    }

    if (keyword === "server") {
      throw new AppError({
        code: "SERVER_ERROR",
        message: "Internal server error occurred while starting scan worker.",
        status: 500,
      });
    }

    const parsed = parseRepoUrl(repoUrl);
    const owner = parsed.ok ? parsed.owner : "owner";
    const repo = parsed.ok ? parsed.repo : "repo";
    const branch = parsed.ok && parsed.branch ? parsed.branch : "main";

    const scanId = "scan_" + Math.random().toString(36).slice(2, 10);
    const session: MockScanSession = {
      scanId,
      repoUrl,
      owner,
      repo,
      branch,
      token,
      keyword: keyword || undefined,
      createdAt: Date.now(),
      lastProgressUpdate: Date.now(),
      progress: 5,
      filesScanned: 0,
      totalFiles: 24,
      matchesFound: 0,
      stalled: keyword === "stall",
      status: "queued",
      liveScanDone: false,
    };
    mockSessions.set(scanId, session);

    // If this is a real repo (no mock error keyword), trigger real live scanning in background
    if (!keyword || keyword === "leaks") {
      performLiveGitHubScan(session).catch(() => {});
    }

    return { scanId, status: "queued" };
  },

  async getProgress(scanId: string): Promise<{
    scanId: string;
    status: "queued" | "running" | "completed" | "failed" | "cancelled";
    progress: number;
    currentStep?: string;
    filesScanned: number;
    totalFiles: number;
    matchesFound: number;
    error?: { code?: string; message?: string };
  }> {
    const session = mockSessions.get(scanId);
    if (!session) {
      throw new AppError({
        code: "REPO_NOT_FOUND",
        message: "Scan not found or expired.",
        status: 404,
      });
    }

    if (session.status === "cancelled") {
      return {
        scanId,
        status: "cancelled",
        progress: session.progress,
        filesScanned: session.filesScanned,
        totalFiles: session.totalFiles,
        matchesFound: session.matchesFound,
      };
    }

    // Keyword: failmid -> reaches 60% then fails
    if (session.keyword === "failmid" && session.progress >= 60) {
      session.status = "failed";
      return {
        scanId,
        status: "failed",
        progress: 60,
        filesScanned: session.filesScanned,
        totalFiles: session.totalFiles,
        matchesFound: session.matchesFound,
        error: {
          code: "SCAN_FAILED",
          message: "Git diff parsing encountered a fatal memory limit.",
        },
      };
    }

    // Keyword: stall -> lock progress at 35% without updating filesScanned or progress
    if (session.keyword === "stall") {
      session.status = "running";
      session.progress = 35;
      session.filesScanned = 12;
      return {
        scanId,
        status: "running",
        progress: 35,
        currentStep: "Analyzing commit diffs...",
        filesScanned: 12,
        totalFiles: session.totalFiles,
        matchesFound: 0,
      };
    }

    // Normal increment
    session.status = "running";
    session.progress = Math.min(100, session.progress + 25);
    if (session.filesScanned === 0) {
      session.filesScanned = Math.max(1, Math.floor((session.progress / 100) * session.totalFiles));
    }

    if (session.realFindings && session.realFindings.length > 0) {
      session.matchesFound = session.realFindings.length;
    } else if (session.keyword === "leaks" && session.progress >= 50) {
      session.matchesFound = 3;
    }

    if (session.progress >= 100) {
      session.status = "completed";
    }

    return {
      scanId,
      status: session.status,
      progress: session.progress,
      currentStep:
        session.progress < 30
          ? "Cloning repository refs and analyzing commit tree..."
          : session.progress < 70
          ? "Scanning diff against 512 security rules..."
          : "Generating report and classifying leaks...",
      filesScanned: session.filesScanned,
      totalFiles: session.totalFiles,
      matchesFound: session.matchesFound,
    };
  },

  async getReport(scanId: string): Promise<Record<string, unknown>> {
    const session = mockSessions.get(scanId);
    if (!session) {
      throw new AppError({
        code: "REPO_NOT_FOUND",
        message: "Scan not found or expired.",
        status: 404,
      });
    }

    // Keyword: badreport -> return malformed schema (missing required fields)
    if (session.keyword === "badreport") {
      return {
        unexpectedShape: true,
        data: null,
      };
    }

    const hasMockLeaks = session.keyword === "leaks";

    // If live scan found real findings, prioritize those!
    let findings: ScanFinding[] = [];
    if (session.realFindings && session.realFindings.length > 0) {
      findings = session.realFindings;
    } else if (hasMockLeaks) {
      findings = [
        {
          id: "f-101",
          severity: "critical",
          ruleName: "AWS Access Key ID",
          ruleId: "aws-access-key-id",
          file: "config/production.env",
          line: 14,
          secret: "AKIAIOSFODNN7EXAMPLE",
          snippet: "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nAWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
          snippetHighlightLine: 14,
          whyFlagged: "Standard 20-character AWS access key pattern detected in configuration file.",
          remediationSteps: [
            "Deactivate and delete this IAM Access Key in the AWS Console immediately.",
            "Review CloudTrail logs for unauthorized usage.",
            "Move secrets to AWS Secrets Manager or environment variables.",
          ],
        },
        {
          id: "f-102",
          severity: "high",
          ruleName: "GitHub Personal Access Token",
          ruleId: "github-pat",
          file: "scripts/deploy.sh",
          line: 8,
          secret: "ghp_16C7e42dBZMhXk9mNpQrSTuvWxYZabcD",
          snippet: 'curl -H "Authorization: token ghp_16C7e42dBZMhXk9mNpQrSTuvWxYZabcD" https://api.github.com/user',
          snippetHighlightLine: 8,
          whyFlagged: "Active GitHub PAT with repo write scope found hardcoded in shell script.",
          remediationSteps: [
            "Revoke this token in GitHub Settings > Developer settings > Personal access tokens.",
            "Use GitHub Actions secrets or environment variables instead.",
          ],
        },
      ];
    }

    return {
      scanId,
      repoUrl: session.repoUrl,
      owner: session.owner,
      repo: session.repo,
      branch: session.branch,
      totalSecrets: findings.length,
      scannedFilesCount: Math.max(session.filesScanned, findings.length),
      durationMs: 1420,
      scannedAt: new Date().toISOString(),
      findings,
    };
  },

  async cancelScan(scanId: string): Promise<{ ok: boolean }> {
    const session = mockSessions.get(scanId);
    if (session) {
      session.status = "cancelled";
    }
    return { ok: true };
  },
};
