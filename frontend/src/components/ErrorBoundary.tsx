// ─── React Error Boundary ────────────────────────────────────────────────────
// Catches render and lifecycle errors and displays a calm fallback with Reload & Go Home.

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { logger } from "../lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ErrorBoundary caught an unhandled render error", error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-center">
          <div className="max-w-[440px] w-full rounded-card border border-border bg-surface p-8 space-y-5 shadow-lg">
            <div className="w-12 h-12 rounded-full bg-critical/20 border border-critical/30 flex items-center justify-center mx-auto text-critical">
              <ShieldAlert size={24} />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-base font-semibold text-primary tracking-tight">
                Something went wrong
              </h1>
              <p className="text-xs text-secondary leading-relaxed">
                An unexpected error prevented this view from rendering. Your settings and repository links are safe.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <pre className="text-2xs font-mono bg-raised border border-border rounded p-3 text-left overflow-x-auto text-critical max-h-36">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="h-8 px-4 rounded-button bg-accent text-bg text-xs font-medium hover:bg-accent/90 transition-colors duration-fast inline-flex items-center gap-1.5"
              >
                <RefreshCw size={13} /> Reload page
              </button>
              <button
                onClick={this.handleGoHome}
                className="h-8 px-4 rounded-button border border-border bg-raised text-primary text-xs font-medium hover:border-[#38383E] transition-colors duration-fast inline-flex items-center gap-1.5"
              >
                <Home size={13} /> Go home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
