// ─── App Error System ────────────────────────────────────────────────────────
// Unified error classification and normalization for GitScan.

export type ErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_HOST"
  | "REPO_NOT_FOUND"
  | "PRIVATE_REPO"
  | "EMPTY_REPO"
  | "RATE_LIMITED"
  | "TOO_LARGE"
  | "TIMEOUT"
  | "NETWORK_OFFLINE"
  | "SERVER_ERROR"
  | "SCAN_FAILED"
  | "CANCELLED"
  | "UNAUTHORIZED_TOKEN"
  | "UNKNOWN";

export type ErrorSeverity = "info" | "warning" | "error";

export type ErrorAction = "retry" | "edit_url" | "add_token" | "wait" | "none";

export interface ErrorConfig {
  title: string;
  message: string;
  severity: ErrorSeverity;
  retryable: boolean;
  action: ErrorAction;
  autoRetry?: {
    attempts: number;
    backoffMs: number;
  };
}

export const ERROR_CONFIGS: Record<ErrorCode, ErrorConfig> = {
  INVALID_URL: {
    title: "Invalid repository link",
    message: "The repository URL is invalid. Check the formatting and try again.",
    severity: "warning",
    retryable: false,
    action: "edit_url",
  },
  UNSUPPORTED_HOST: {
    title: "Unsupported Git host",
    message: "Only public GitHub repositories (github.com) are currently supported.",
    severity: "warning",
    retryable: false,
    action: "edit_url",
  },
  REPO_NOT_FOUND: {
    title: "Repository not found",
    message: "We couldn't find that repository. Check the spelling, or it may be private.",
    severity: "error",
    retryable: false,
    action: "edit_url",
  },
  PRIVATE_REPO: {
    title: "Private repository",
    message: "This repository is private. Add an access token to scan it.",
    severity: "warning",
    retryable: true,
    action: "add_token",
  },
  UNAUTHORIZED_TOKEN: {
    title: "Invalid access token",
    message: "The access token provided is invalid or lacks repository read permissions.",
    severity: "error",
    retryable: true,
    action: "add_token",
  },
  EMPTY_REPO: {
    title: "Repository is empty",
    message: "This repository has no commits to scan.",
    severity: "info",
    retryable: false,
    action: "edit_url",
  },
  RATE_LIMITED: {
    title: "Rate limit reached",
    message: "Too many scans right now. You can retry in {n}s.",
    severity: "warning",
    retryable: true,
    action: "wait",
    autoRetry: {
      attempts: 2,
      backoffMs: 5000,
    },
  },
  TOO_LARGE: {
    title: "Repository too large",
    message: "This repository is too large to scan in full. Try scanning the latest commit only.",
    severity: "warning",
    retryable: false,
    action: "edit_url",
  },
  TIMEOUT: {
    title: "Scan timed out",
    message: "The scan timed out. The repository may be too large or GitHub is responding slowly.",
    severity: "error",
    retryable: true,
    action: "retry",
    autoRetry: {
      attempts: 1,
      backoffMs: 2000,
    },
  },
  NETWORK_OFFLINE: {
    title: "No connection",
    message: "You appear to be offline. We'll retry when you reconnect.",
    severity: "warning",
    retryable: true,
    action: "retry",
  },
  SERVER_ERROR: {
    title: "Scanner service error",
    message: "We encountered a problem while scanning. Please try again in a few moments.",
    severity: "error",
    retryable: true,
    action: "retry",
    autoRetry: {
      attempts: 3,
      backoffMs: 1000,
    },
  },
  SCAN_FAILED: {
    title: "Scan failed",
    message: "The scan could not be completed. Please try again.",
    severity: "error",
    retryable: true,
    action: "retry",
  },
  CANCELLED: {
    title: "Scan cancelled",
    message: "The scan was stopped.",
    severity: "info",
    retryable: false,
    action: "none",
  },
  UNKNOWN: {
    title: "Unexpected error",
    message: "An unexpected error occurred. Please try again.",
    severity: "error",
    retryable: true,
    action: "retry",
  },
};

export interface AppErrorInit {
  code: ErrorCode;
  title?: string;
  message?: string;
  severity?: ErrorSeverity;
  retryable?: boolean;
  action?: ErrorAction;
  autoRetry?: { attempts: number; backoffMs: number };
  status?: number;
  retryAfterSeconds?: number;
  cause?: unknown;
  details?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly title: string;
  readonly severity: ErrorSeverity;
  readonly retryable: boolean;
  readonly action: ErrorAction;
  readonly autoRetry?: { attempts: number; backoffMs: number };
  readonly status?: number;
  readonly retryAfterSeconds?: number;
  readonly details?: unknown;
  readonly cause?: unknown;

  constructor(init: AppErrorInit) {
    const config = ERROR_CONFIGS[init.code] ?? ERROR_CONFIGS.UNKNOWN;
    const resolvedTitle = init.title ?? config.title;

    let resolvedMessage = init.message ?? config.message;
    if (init.code === "RATE_LIMITED" && init.retryAfterSeconds !== undefined) {
      resolvedMessage = resolvedMessage.replace("{n}", String(init.retryAfterSeconds));
    } else if (resolvedMessage.includes("{n}")) {
      resolvedMessage = resolvedMessage.replace("{n}", "a few");
    }

    super(resolvedMessage);
    this.name = "AppError";
    this.code = init.code;
    this.title = resolvedTitle;
    this.severity = init.severity ?? config.severity;
    this.retryable = init.retryable ?? config.retryable;
    this.action = init.action ?? config.action;
    this.autoRetry = init.autoRetry ?? config.autoRetry;
    this.status = init.status;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.details = init.details;

    if (init.cause) {
      this.cause = init.cause;
    }
  }
}

/**
 * Converts any arbitrary error (fetch TypeError, AbortError, HTTP responses,
 * backend JSON envelopes, Error instances, strings, etc.) into a classified AppError.
 */
export function normalizeError(
  error: unknown,
  fallbackMessage?: string,
  context?: { hasToken?: boolean; status?: number; headers?: Headers | Record<string, string> }
): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Abort / Cancellation
  if (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  ) {
    return new AppError({
      code: "CANCELLED",
      cause: error,
    });
  }

  // Browser offline
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return new AppError({
      code: "NETWORK_OFFLINE",
      cause: error,
    });
  }

  // Network Fetch Failure (e.g. CORS, DNS, connection refused)
  if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
    return new AppError({
      code: "NETWORK_OFFLINE",
      message: "Unable to reach the scanning service. Check your connection.",
      cause: error,
    });
  }

  // Check for HTTP-like object: { status, headers, data, error }
  let status = context?.status;
  let backendCode: string | undefined;
  let backendMessage: string | undefined;
  let retryAfterSeconds: number | undefined;

  const rawObj = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;

  if (rawObj) {
    if (typeof rawObj.status === "number") {
      status = rawObj.status;
    }

    // Inspect backend error envelope: { error: { code, message } } or { message }
    if (typeof rawObj.error === "object" && rawObj.error !== null) {
      const errSub = rawObj.error as Record<string, unknown>;
      if (typeof errSub.code === "string") backendCode = errSub.code;
      if (typeof errSub.message === "string") backendMessage = errSub.message;
    } else if (typeof rawObj.message === "string") {
      backendMessage = rawObj.message;
    }

    if (typeof rawObj.code === "string" && !backendCode) {
      backendCode = rawObj.code;
    }

    // Check retry-after header or field
    if (typeof rawObj.retryAfterSeconds === "number") {
      retryAfterSeconds = rawObj.retryAfterSeconds;
    }
  }

  // Parse headers if passed
  const headers = context?.headers;
  if (headers) {
    const getHeader = (key: string): string | null => {
      if (typeof (headers as Headers).get === "function") {
        return (headers as Headers).get(key);
      }
      const record = headers as Record<string, string>;
      return record[key] ?? record[key.toLowerCase()] ?? null;
    };

    const retryHeader = getHeader("retry-after");
    if (retryHeader) {
      const parsed = parseInt(retryHeader, 10);
      if (!isNaN(parsed) && parsed > 0) {
        retryAfterSeconds = parsed;
      }
    }

    const rateLimitRemaining = getHeader("x-ratelimit-remaining");
    if (rateLimitRemaining === "0" && !status) {
      status = 429;
    }
  }

  // Explicit known backend code match
  if (backendCode && backendCode in ERROR_CONFIGS) {
    return new AppError({
      code: backendCode as ErrorCode,
      message: backendMessage,
      status,
      retryAfterSeconds,
      cause: error,
    });
  }

  // HTTP status mapping
  if (status !== undefined) {
    if (status === 400) {
      return new AppError({
        code: "INVALID_URL",
        message: backendMessage ?? "The repository request was malformed.",
        status,
        cause: error,
      });
    }

    if (status === 401) {
      return new AppError({
        code: "UNAUTHORIZED_TOKEN",
        message: backendMessage,
        status,
        cause: error,
      });
    }

    if (status === 403) {
      if (context?.hasToken) {
        return new AppError({
          code: "UNAUTHORIZED_TOKEN",
          message: backendMessage ?? "This token does not have permission to access the repository.",
          status,
          cause: error,
        });
      }
      if (retryAfterSeconds || backendMessage?.toLowerCase().includes("rate limit")) {
        return new AppError({
          code: "RATE_LIMITED",
          status,
          retryAfterSeconds: retryAfterSeconds ?? 60,
          cause: error,
        });
      }
      return new AppError({
        code: "PRIVATE_REPO",
        message: backendMessage,
        status,
        cause: error,
      });
    }

    if (status === 404) {
      return new AppError({
        code: "REPO_NOT_FOUND",
        message: backendMessage,
        status,
        cause: error,
      });
    }

    if (status === 408 || status === 504) {
      return new AppError({
        code: "TIMEOUT",
        message: backendMessage,
        status,
        cause: error,
      });
    }

    if (status === 413) {
      return new AppError({
        code: "TOO_LARGE",
        message: backendMessage,
        status,
        cause: error,
      });
    }

    if (status === 429) {
      return new AppError({
        code: "RATE_LIMITED",
        message: backendMessage,
        status,
        retryAfterSeconds: retryAfterSeconds ?? 30,
        cause: error,
      });
    }

    if (status >= 500) {
      return new AppError({
        code: "SERVER_ERROR",
        message: backendMessage,
        status,
        cause: error,
      });
    }
  }

  // Error instance message matching heuristics
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("timed out")) {
      return new AppError({ code: "TIMEOUT", cause: error });
    }
    if (msg.includes("network") || msg.includes("offline")) {
      return new AppError({ code: "NETWORK_OFFLINE", cause: error });
    }
    if (msg.includes("rate limit")) {
      return new AppError({ code: "RATE_LIMITED", cause: error });
    }
    if (msg.includes("not found")) {
      return new AppError({ code: "REPO_NOT_FOUND", cause: error });
    }
    if (msg.includes("empty repository") || msg.includes("empty repo")) {
      return new AppError({ code: "EMPTY_REPO", cause: error });
    }
    if (msg.includes("too large")) {
      return new AppError({ code: "TOO_LARGE", cause: error });
    }
  }

  // Plain string
  if (typeof error === "string" && error.trim().length > 0) {
    return new AppError({
      code: "UNKNOWN",
      message: error,
    });
  }

  // Fallback
  return new AppError({
    code: "UNKNOWN",
    message: fallbackMessage ?? ERROR_CONFIGS.UNKNOWN.message,
    cause: error,
  });
}
