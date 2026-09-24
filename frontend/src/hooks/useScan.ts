// ─── Scan State Machine & Resilient Polling Hook ──────────────────────────────
// Enforces valid transitions and detects network failures, stalls, timeouts, and report retries.

import { useReducer, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { AppError, normalizeError } from "../lib/errors";
import { parseRepoUrl } from "../lib/parseRepoUrl";
import { apiClient, type ScanProgress, type ScanReport } from "../api/client";
import { logger } from "../lib/logger";

export type ScanPhase =
  | "idle"
  | "validating"
  | "submitting"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ScanState {
  phase: ScanPhase;
  scanId: string | null;
  repoUrl: string;
  normalizedUrl: string | null;
  owner: string | null;
  repo: string | null;
  branch?: string;
  progress: number;
  currentStep: string;
  filesScanned: number;
  totalFiles: number;
  matchesFound: number;
  report: ScanReport | null;
  error: AppError | null;
  isReconnecting: boolean;
  consecutivePollErrors: number;
  stalledWarning: boolean;
  isOffline: boolean;
}

type ScanAction =
  | { type: "START_VALIDATION"; payload: { repoUrl: string } }
  | { type: "VALIDATION_FAILED"; payload: { error: AppError } }
  | { type: "START_SUBMISSION"; payload: { normalizedUrl: string; owner: string; repo: string; branch?: string } }
  | { type: "SCAN_QUEUED"; payload: { scanId: string } }
  | { type: "PROGRESS_UPDATE"; payload: ScanProgress }
  | { type: "SET_RECONNECTING"; payload: { consecutiveErrors: number } }
  | { type: "SET_STALL_WARNING"; payload: boolean }
  | { type: "SCAN_COMPLETED"; payload: { report: ScanReport } }
  | { type: "SCAN_FAILED"; payload: { error: AppError } }
  | { type: "SCAN_CANCELLED" }
  | { type: "SET_OFFLINE"; payload: boolean }
  | { type: "RESET" };

const initialState: ScanState = {
  phase: "idle",
  scanId: null,
  repoUrl: "",
  normalizedUrl: null,
  owner: null,
  repo: null,
  branch: undefined,
  progress: 0,
  currentStep: "",
  filesScanned: 0,
  totalFiles: 0,
  matchesFound: 0,
  report: null,
  error: null,
  isReconnecting: false,
  consecutivePollErrors: 0,
  stalledWarning: false,
  isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
};

function scanReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case "START_VALIDATION":
      return {
        ...initialState,
        phase: "validating",
        repoUrl: action.payload.repoUrl,
        isOffline: state.isOffline,
      };

    case "VALIDATION_FAILED":
      return {
        ...state,
        phase: "failed",
        error: action.payload.error,
      };

    case "START_SUBMISSION":
      return {
        ...state,
        phase: "submitting",
        normalizedUrl: action.payload.normalizedUrl,
        owner: action.payload.owner,
        repo: action.payload.repo,
        branch: action.payload.branch,
        error: null,
      };

    case "SCAN_QUEUED":
      return {
        ...state,
        phase: "queued",
        scanId: action.payload.scanId,
        currentStep: "Scan queued. Initializing scanner worker...",
        progress: 2,
        error: null,
      };

    case "PROGRESS_UPDATE": {
      // Guard against late progress updates if cancelled or failed
      if (state.phase === "cancelled" || state.phase === "failed") {
        return state;
      }
      const p = action.payload;
      return {
        ...state,
        phase: p.status === "completed" ? state.phase : "running",
        progress: Math.max(state.progress, p.progress),
        currentStep: p.currentStep ?? state.currentStep,
        filesScanned: p.filesScanned ?? state.filesScanned,
        totalFiles: p.totalFiles ?? state.totalFiles,
        matchesFound: p.matchesFound ?? state.matchesFound,
        isReconnecting: false,
        consecutivePollErrors: 0,
      };
    }

    case "SET_RECONNECTING":
      return {
        ...state,
        isReconnecting: true,
        consecutivePollErrors: action.payload.consecutiveErrors,
      };

    case "SET_STALL_WARNING":
      return {
        ...state,
        stalledWarning: action.payload,
      };

    case "SCAN_COMPLETED":
      return {
        ...state,
        phase: "completed",
        progress: 100,
        currentStep: "Scan completed",
        report: action.payload.report,
        matchesFound: action.payload.report.totalSecrets,
        error: null,
        isReconnecting: false,
        stalledWarning: false,
      };

    case "SCAN_FAILED":
      return {
        ...state,
        phase: "failed",
        error: action.payload.error,
        isReconnecting: false,
        stalledWarning: false,
      };

    case "SCAN_CANCELLED":
      return {
        ...state,
        phase: "cancelled",
        currentStep: "Scan stopped by user",
        error: new AppError({
          code: "CANCELLED",
          title: "Scan stopped",
          message: "The scan was stopped.",
          severity: "info",
          retryable: false,
          action: "none",
        }),
        isReconnecting: false,
        stalledWarning: false,
      };

    case "SET_OFFLINE":
      return {
        ...state,
        isOffline: action.payload,
      };

    case "RESET":
      return {
        ...initialState,
        isOffline: state.isOffline,
      };

    default:
      return state;
  }
}

export function useScan() {
  const [state, dispatch] = useReducer(scanReducer, initialState);
  const [searchParams, setSearchParams] = useSearchParams();

  // Active controller to abort requests on cancel or unmount
  const abortControllerRef = useRef<AbortController | null>(null);

  // Timers and tracker refs
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef = useRef<{ lastProgress: number; lastChangeTime: number }>({
    lastProgress: 0,
    lastChangeTime: Date.now(),
  });
  const consecutiveErrorsRef = useRef(0);
  const isMountedRef = useRef(true);

  // Sync scanId into URL query string for refresh mid-scan resume
  useEffect(() => {
    if (state.scanId && (state.phase === "running" || state.phase === "queued")) {
      const currentParam = searchParams.get("scanId");
      if (currentParam !== state.scanId) {
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set("scanId", state.scanId!);
          return next;
        }, { replace: true });
      }
    } else if (state.phase === "idle" && searchParams.has("scanId")) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("scanId");
        return next;
      }, { replace: true });
    }
  }, [state.scanId, state.phase, searchParams, setSearchParams]);

  // Clean up all resources
  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Network online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: "SET_OFFLINE", payload: false });
      // Resume immediately if in progress
      if (state.phase === "running" || state.phase === "queued") {
        pollImmediate();
      }
    };

    const handleOffline = () => {
      dispatch({ type: "SET_OFFLINE", payload: true });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [state.phase]);

  // Fetch final report with up to 3 automatic retries
  const fetchReportWithRetry = useCallback(async (scanId: string): Promise<void> => {
    let reportAttempts = 0;
    const maxReportAttempts = 3;

    while (reportAttempts < maxReportAttempts) {
      if (!isMountedRef.current) return;
      try {
        reportAttempts++;
        const report = await apiClient.getScanReport(scanId);
        if (isMountedRef.current) {
          dispatch({ type: "SCAN_COMPLETED", payload: { report } });
        }
        return;
      } catch (err) {
        const appErr = normalizeError(err);
        if (reportAttempts >= maxReportAttempts) {
          if (isMountedRef.current) {
            dispatch({
              type: "SCAN_FAILED",
              payload: {
                error: new AppError({
                  code: appErr.code === "SERVER_ERROR" ? "SERVER_ERROR" : "SCAN_FAILED",
                  title: "Failed to load report",
                  message: "The scan finished, but we couldn't retrieve the final results. You can retry loading the report.",
                  action: "retry",
                  retryable: true,
                  cause: err,
                }),
              },
            });
          }
          return;
        }
        await new Promise(r => setTimeout(r, 1000 * reportAttempts));
      }
    }
  }, []);

  // Poll runner
  const poll = useCallback(async (scanId: string) => {
    if (!isMountedRef.current) return;

    // Pause polling while browser is offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      pollTimerRef.current = setTimeout(() => poll(scanId), 3000);
      return;
    }

    try {
      const progress = await apiClient.getScanProgress(scanId);
      if (!isMountedRef.current) return;

      consecutiveErrorsRef.current = 0;

      // Stall detection: check if progress and files are stuck
      const now = Date.now();
      if (progress.progress !== stallTimerRef.current.lastProgress) {
        stallTimerRef.current = {
          lastProgress: progress.progress,
          lastChangeTime: now,
        };
        dispatch({ type: "SET_STALL_WARNING", payload: false });
      } else {
        const stallDurationMs = now - stallTimerRef.current.lastChangeTime;
        // 45s warning
        if (stallDurationMs >= 45000 && !state.stalledWarning) {
          dispatch({ type: "SET_STALL_WARNING", payload: true });
        }
        // 3m timeout
        if (stallDurationMs >= 180000) {
          dispatch({
            type: "SCAN_FAILED",
            payload: {
              error: new AppError({
                code: "TIMEOUT",
                title: "Scan stalled",
                message: "This repository scan has stalled for over 3 minutes with no new progress.",
                retryable: true,
                action: "retry",
              }),
            },
          });
          return;
        }
      }

      // Check status from backend
      if (progress.status === "failed") {
        const backendErr = progress.error
          ? normalizeError(progress.error)
          : new AppError({ code: "SCAN_FAILED" });
        dispatch({ type: "SCAN_FAILED", payload: { error: backendErr } });
        return;
      }

      if (progress.status === "cancelled") {
        dispatch({ type: "SCAN_CANCELLED" });
        return;
      }

      if (progress.status === "completed" || progress.progress >= 100) {
        dispatch({ type: "PROGRESS_UPDATE", payload: progress });
        await fetchReportWithRetry(scanId);
        return;
      }

      // Still running or queued
      dispatch({ type: "PROGRESS_UPDATE", payload: progress });

      // Determine next poll interval: 5s if tab is hidden, 1.2s if visible
      const interval = typeof document !== "undefined" && document.hidden ? 5000 : 1200;
      pollTimerRef.current = setTimeout(() => poll(scanId), interval);
    } catch (err) {
      if (!isMountedRef.current) return;

      const appErr = normalizeError(err);

      // If user aborted
      if (appErr.code === "CANCELLED") {
        dispatch({ type: "SCAN_CANCELLED" });
        return;
      }

      consecutiveErrorsRef.current++;
      const count = consecutiveErrorsRef.current;

      // Tolerate up to 3 consecutive poll errors with backoff
      if (count <= 3) {
        dispatch({ type: "SET_RECONNECTING", payload: { consecutiveErrors: count } });
        const backoff = count * 1500;
        logger.warn(`Poll error #${count} for scan ${scanId}. Reconnecting in ${backoff}ms...`);
        pollTimerRef.current = setTimeout(() => poll(scanId), backoff);
      } else {
        // Failed after 3 consecutive attempts
        dispatch({
          type: "SCAN_FAILED",
          payload: {
            error: new AppError({
              code: typeof navigator !== "undefined" && !navigator.onLine ? "NETWORK_OFFLINE" : "SERVER_ERROR",
              title: "Connection lost",
              message: "Unable to reach the scanning service after multiple reconnection attempts.",
              retryable: true,
              action: "retry",
              cause: err,
            }),
          },
        });
      }
    }
  }, [fetchReportWithRetry, state.stalledWarning]);

  const pollImmediate = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (state.scanId) {
      poll(state.scanId);
    }
  }, [poll, state.scanId]);

  // Adjust polling when document visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && (state.phase === "running" || state.phase === "queued")) {
        pollImmediate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [state.phase, pollImmediate]);

  // Resume scan from scanId in query parameters on refresh
  useEffect(() => {
    const urlScanId = searchParams.get("scanId");
    if (urlScanId && state.phase === "idle" && !state.scanId) {
      dispatch({ type: "SCAN_QUEUED", payload: { scanId: urlScanId } });
      stallTimerRef.current = { lastProgress: 0, lastChangeTime: Date.now() };
      consecutiveErrorsRef.current = 0;
      poll(urlScanId);
    }
  }, [searchParams, state.phase, state.scanId, poll]);

  /**
   * Main scan trigger.
   */
  const startScan = useCallback(async (rawUrl: string, token?: string) => {
    cleanup();
    dispatch({ type: "START_VALIDATION", payload: { repoUrl: rawUrl } });

    // 1. Client-side URL validation
    const parsed = parseRepoUrl(rawUrl);
    if (!parsed.ok) {
      dispatch({
        type: "VALIDATION_FAILED",
        payload: {
          error: new AppError({
            code: parsed.code,
            message: parsed.message,
          }),
        },
      });
      return;
    }

    // 2. State transition to submitting
    dispatch({
      type: "START_SUBMISSION",
      payload: {
        normalizedUrl: parsed.normalizedUrl,
        owner: parsed.owner,
        repo: parsed.repo,
        branch: parsed.branch,
      },
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await apiClient.startScan(parsed.normalizedUrl, token, controller.signal);
      if (!isMountedRef.current) return;

      dispatch({ type: "SCAN_QUEUED", payload: { scanId: result.scanId } });

      stallTimerRef.current = {
        lastProgress: 0,
        lastChangeTime: Date.now(),
      };
      consecutiveErrorsRef.current = 0;

      // Start polling
      poll(result.scanId);
    } catch (err) {
      if (!isMountedRef.current) return;
      const appErr = normalizeError(err, undefined, { hasToken: Boolean(token) });
      dispatch({ type: "SCAN_FAILED", payload: { error: appErr } });
    }
  }, [cleanup, poll]);

  /**
   * Cancels in-flight scan.
   */
  const cancelScan = useCallback(async () => {
    const currentScanId = state.scanId;
    cleanup();
    dispatch({ type: "SCAN_CANCELLED" });

    if (currentScanId) {
      try {
        await apiClient.cancelScan(currentScanId);
      } catch (err) {
        logger.warn(`Failed to notify server of cancellation: ${err}`);
      }
    }
  }, [cleanup, state.scanId]);

  /**
   * Retries the current scan with existing settings or with a provided access token.
   */
  const retry = useCallback((tokenOverride?: string) => {
    const targetUrl = state.normalizedUrl || state.repoUrl;
    if (targetUrl) {
      startScan(targetUrl, tokenOverride);
    }
  }, [state.normalizedUrl, state.repoUrl, startScan]);

  /**
   * Resets scan state to idle.
   */
  const reset = useCallback(() => {
    cleanup();
    dispatch({ type: "RESET" });
  }, [cleanup]);

  /**
   * Reloads the final report if report fetch previously failed.
   */
  const reloadReport = useCallback(() => {
    if (state.scanId) {
      fetchReportWithRetry(state.scanId);
    }
  }, [state.scanId, fetchReportWithRetry]);

  return {
    state,
    startScan,
    cancelScan,
    retry,
    reset,
    reloadReport,
  };
}
