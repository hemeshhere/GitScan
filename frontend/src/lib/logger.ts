// ─── Safe Logger ─────────────────────────────────────────────────────────────
// Logs errors and diagnostic info while protecting tokens, credentials, and secrets.

import { AppError } from "./errors";

// Patterns to sanitize from strings, objects, and URLs
const TOKEN_PATTERNS = [
  /ghp_[a-zA-Z0-9]{36}/gi,
  /github_pat_[a-zA-Z0-9_]{50,}/gi,
  /xoxb-[a-zA-Z0-9-]+/gi,
  /sk_live_[a-zA-Z0-9]+/gi,
  /AKIA[0-9A-Z]{16}/g,
  /Bearer\s+[a-zA-Z0-9_.~+-]+/gi,
  /token=[a-zA-Z0-9_.~+-]+/gi,
  /secret=[a-zA-Z0-9_.~+-]+/gi,
  /:\/\/([^:]+):([^@]+)@/gi, // embedded credentials in URLs (e.g. https://user:pass@host)
];

export function sanitize(text: string): string {
  let cleaned = text;
  // Replace embedded URL credentials first: https://user:pass@ -> https://***:***@
  cleaned = cleaned.replace(/:\/\/([^:]+):([^@]+)@/gi, "://***:***@");

  for (const pattern of TOKEN_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[REDACTED_CREDENTIAL]");
  }
  return cleaned;
}

function sanitizeValue(value: unknown, seen = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return sanitize(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map(v => sanitizeValue(v, seen));
    }

    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("token") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("password") ||
        lowerKey.includes("authorization") ||
        lowerKey.includes("apikey")
      ) {
        sanitizedObj[key] = "[REDACTED]";
      } else {
        sanitizedObj[key] = sanitizeValue(val, seen);
      }
    }
    return sanitizedObj;
  }

  return String(value);
}

export const logger = {
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const isDev = Boolean(import.meta.env?.DEV);

    if (isDev) {
      const safeContext = context ? sanitizeValue(context) : undefined;
      if (error instanceof AppError) {
        console.error(`[GitScan ${error.code}] ${message}:`, {
          title: error.title,
          message: error.message,
          severity: error.severity,
          retryable: error.retryable,
          action: error.action,
          status: error.status,
          retryAfterSeconds: error.retryAfterSeconds,
          cause: error.cause,
          details: sanitizeValue(error.details),
          context: safeContext,
        });
      } else if (error instanceof Error) {
        console.error(`[GitScan Error] ${message}:`, {
          name: error.name,
          message: sanitize(error.message),
          stack: error.stack ? sanitize(error.stack) : undefined,
          context: safeContext,
        });
      } else {
        console.error(`[GitScan] ${message}:`, sanitizeValue(error), safeContext);
      }
    } else {
      // Production: Minimal telemetry, code and message only
      if (error instanceof AppError) {
        console.error(`[GitScan] ${error.code}: ${sanitize(error.message)}`);
      } else if (error instanceof Error) {
        console.error(`[GitScan] ${sanitize(error.message)}`);
      } else {
        console.error(`[GitScan] ${sanitize(message)}`);
      }
    }
  },

  warn(message: string, context?: Record<string, unknown>) {
    const safeMsg = sanitize(message);
    if (import.meta.env?.DEV) {
      console.warn(`[GitScan] ${safeMsg}`, context ? sanitizeValue(context) : "");
    } else {
      console.warn(`[GitScan] ${safeMsg}`);
    }
  },

  info(message: string, context?: Record<string, unknown>) {
    if (import.meta.env?.DEV) {
      console.info(`[GitScan] ${sanitize(message)}`, context ? sanitizeValue(context) : "");
    }
  },
};
