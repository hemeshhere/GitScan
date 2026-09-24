import { Search } from "lucide-react";
import { LiveDot } from "../ui/Badge";
import { cn } from "../../lib/utils";

interface PageHeaderProps {
  title: string;
  breadcrumb?: string[];
  actions?: React.ReactNode;
  onSearchClick?: () => void;
  className?: string;
}

export function PageHeader({ title, breadcrumb, actions, onSearchClick, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between h-12 px-6 border-b border-border bg-surface shrink-0", className)}>
      {/* Left: title + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumb?.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2 text-sm text-muted">
            <span>{crumb}</span>
            <span className="text-border">/</span>
          </span>
        ))}
        <h1 className="text-sm font-medium text-primary truncate">{title}</h1>
      </div>

      {/* Right: actions + search + live indicator */}
      <div className="flex items-center gap-3">
        {actions}
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            aria-label="Open command palette (Cmd+K)"
            className="flex items-center gap-2 h-7 px-2.5 rounded-btn border border-border text-muted text-xs hover:border-[#38383E] hover:text-secondary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <Search size={12} />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-2xs border border-border-subtle rounded px-1 font-mono">⌘K</kbd>
          </button>
        )}
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-2xs text-muted">
          <LiveDot />
          <span className="hidden sm:inline">Live</span>
        </div>
      </div>
    </div>
  );
}
