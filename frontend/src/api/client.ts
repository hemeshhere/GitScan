// ─── API Client with Resilient Error Handling & Zod Validation ─────────────────

import { z } from "zod";
import { AppError, normalizeError } from "../lib/errors";
import { logger } from "../lib/logger";
import { mockAdapter } from "./mockAdapter";

export const BASE_URL = ((import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL) ?? "http://localhost:8000/api";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const ScanProgressSchema = z.object({
  scanId: z.string(),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  progress: z.number().min(0).max(100),
  currentStep: z.string().optional(),
  filesScanned: z.number().optional().default(0),
  totalFiles: z.number().optional().default(0),
  matchesFound: z.number().optional().default(0),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
  retryAfterSeconds: z.number().optional(),
});

export type ScanProgress = z.infer<typeof ScanProgressSchema>;

export const FindingSchema = z.object({
  id: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  ruleName: z.string(),
  ruleId: z.string(),
  file: z.string(),
  line: z.number(),
  secret: z.string(),
  snippet: z.string().optional().default(""),
  snippetHighlightLine: z.number().optional(),
  whyFlagged: z.string().optional().default(""),
  remediationSteps: z.array(z.string()).optional().default([]),
});

export type ScanFinding = z.infer<typeof FindingSchema>;

export const ScanReportSchema = z.object({
  scanId: z.string(),
  repoUrl: z.string(),
  owner: z.string(),
  repo: z.string(),
  branch: z.string().optional(),
  totalSecrets: z.number(),
  scannedFilesCount: z.number().optional().default(0),
  scannedAt: z.string().optional(),
  durationMs: z.number().optional().default(0),
  findings: z.array(FindingSchema),
});

export type ScanReport = z.infer<typeof ScanReportSchema>;

// ─── Request Options & Duplicate Submission Prevention ────────────────────────

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  hasToken?: boolean;
}

// In-flight mutex for scan submissions to prevent duplicate double-click / rapid Enter submits
let isSubmittingScan = false;

// Sleep helper with jitter
function delay(ms: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 200);
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

/**
 * Universal request wrapper with AbortController, 15s timeout, JSON parse guard,
 * exponential backoff retry for idempotent GETs, and normalized errors.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeoutMs = 15000,
    retries = options.method === "GET" || !options.method ? 3 : 0,
    hasToken = false,
    ...fetchOptions
  } = options;

  const isGet = !fetchOptions.method || fetchOptions.method.toUpperCase() === "GET";

  let lastError: AppError | null = null;
  const maxAttempts = isGet ? Math.max(1, retries) : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    let timeoutTriggered = false;

    const timeoutTimer = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, timeoutMs);

    // Chain caller's abort signal if supplied
    if (fetchOptions.signal) {
      fetchOptions.signal.addEventListener("abort", () => {
        controller.abort();
      });
    }

    try {
      const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

      const res = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...fetchOptions.headers,
        },
      });

      clearTimeout(timeoutTimer);

      // Status ok check
      if (!res.ok) {
        // Attempt to parse JSON error envelope, fallback to text/empty
        let errorData: unknown;
        try {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            errorData = await res.json();
          } else {
            errorData = { message: await res.text() };
          }
        } catch {
          errorData = null;
        }

        const appErr = normalizeError(errorData, undefined, {
          status: res.status,
          headers: res.headers,
          hasToken,
        });

        // If retryable code and GET, allow loop to continue
        if (isGet && attempt < maxAttempts && appErr.retryable) {
          lastError = appErr;
          const backoff = attempt === 1 ? 500 : attempt === 2 ? 1000 : 2000;
          logger.warn(`GET ${path} failed with ${appErr.code}. Retrying in ${backoff}ms (attempt ${attempt}/${maxAttempts})...`);
          await delay(backoff);
          continue;
        }

        throw appErr;
      }

      // Handle 204 No Content
      if (res.status === 204) {
        return {} as T;
      }

      // JSON Parse Guard
      try {
        const text = await res.text();
        if (!text.trim()) {
          return {} as T;
        }
        return JSON.parse(text) as T;
      } catch (jsonErr) {
        throw new AppError({
          code: "SERVER_ERROR",
          message: "Received an unparseable response from the scanning engine.",
          cause: jsonErr,
        });
      }
    } catch (err) {
      clearTimeout(timeoutTimer);

      // Handle timeout cancellation
      let finalErr: AppError;
      if (timeoutTriggered) {
        finalErr = new AppError({
          code: "TIMEOUT",
          message: `The request timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
          cause: err,
        });
      } else {
        finalErr = normalizeError(err, undefined, { hasToken });
      }

      lastError = finalErr;

      // Only retry idempotent GETs on retryable errors
      if (isGet && attempt < maxAttempts && finalErr.retryable && finalErr.code !== "CANCELLED") {
        const backoff = attempt === 1 ? 500 : attempt === 2 ? 1000 : 2000;
        logger.warn(`GET ${path} failed with ${finalErr.code}. Retrying in ${backoff}ms...`);
        await delay(backoff);
        continue;
      }

      throw finalErr;
    }
  }

  throw lastError ?? new AppError({ code: "UNKNOWN" });
}

// ─── Scan API Service ────────────────────────────────────────────────────────

export const apiClient = {
  /**
   * Submits a repository to begin scanning.
   * Enforces duplicate submission prevention.
   */
  async startScan(
    repoUrl: string,
    token?: string,
    signal?: AbortSignal
  ): Promise<{ scanId: string; status: "queued" }> {
    if (isSubmittingScan) {
      throw new AppError({
        code: "INVALID_URL",
        message: "A scan submission is already in progress. Please wait.",
        severity: "info",
      });
    }

    isSubmittingScan = true;

    try {
      // Mock / Dev fallback check
      const hasMockTriggers = Boolean(mockAdapter.forceKeyword || mockAdapter.extractTriggerKeyword(repoUrl));
      if (hasMockTriggers || BASE_URL.includes("localhost:8000")) {
        try {
          return await mockAdapter.startScan(repoUrl, token);
        } catch (mockErr) {
          // If mock threw a classified AppError, pass it through directly
          if (mockErr instanceof AppError) throw mockErr;
        }
      }

      const res = await request<{ scanId: string; status: "queued" }>("/scans", {
        method: "POST",
        body: JSON.stringify({ repoUrl, token }),
        signal,
        hasToken: Boolean(token),
      });

      return res;
    } finally {
      // Small debounce lock release
      setTimeout(() => {
        isSubmittingScan = false;
      }, 400);
    }
  },

  /**
   * Polls scan progress and validates response shape via Zod.
   */
  async getScanProgress(scanId: string, signal?: AbortSignal): Promise<ScanProgress> {
    try {
      let raw: unknown;
      if (scanId.startsWith("scan_")) {
        raw = await mockAdapter.getProgress(scanId);
      } else {
        raw = await request<unknown>(`/scans/${scanId}/progress`, {
          method: "GET",
          signal,
          timeoutMs: 10000,
        });
      }

      const parseResult = ScanProgressSchema.safeParse(raw);
      if (!parseResult.success) {
        logger.error("ScanProgress schema validation failed", parseResult.error, { raw });
        throw new AppError({
          code: "SERVER_ERROR",
          message: "Received an invalid progress update from the scanner.",
          details: parseResult.error.format(),
        });
      }

      return parseResult.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * Fetches final report and validates report shape via Zod.
   */
  async getScanReport(scanId: string, signal?: AbortSignal): Promise<ScanReport> {
    try {
      let raw: unknown;
      if (scanId.startsWith("scan_")) {
        raw = await mockAdapter.getReport(scanId);
      } else {
        raw = await request<unknown>(`/scans/${scanId}/report`, {
          method: "GET",
          signal,
          timeoutMs: 15000,
        });
      }

      const parseResult = ScanReportSchema.safeParse(raw);
      if (!parseResult.success) {
        logger.error("ScanReport schema validation failed", parseResult.error, { raw });
        throw new AppError({
          code: "SERVER_ERROR",
          message: "Received an invalid report shape from the scanner.",
          details: parseResult.error.format(),
        });
      }

      return parseResult.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * Requests cancellation of an in-progress scan.
   */
  async cancelScan(scanId: string): Promise<{ ok: boolean }> {
    if (scanId.startsWith("scan_")) {
      return mockAdapter.cancelScan(scanId);
    }
    return request<{ ok: boolean }>(`/scans/${scanId}/cancel`, {
      method: "POST",
    });
  },
};
