import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";
import { Badge, SeverityDot } from "../ui/Badge";
import { CopyableCode } from "../ui/CodeBlock";
import { Skeleton } from "../ui/Skeleton";
import { api, type LiveEvent } from "../../lib/api";

export function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    const data = await api.getLiveFeed();
    if (data === null) {
      setError(true);
    } else {
      setEvents(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-card border border-border bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-primary">Live feed</h3>
        <button
          onClick={load}
          aria-label="Refresh live feed"
          className="text-muted hover:text-secondary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded p-0.5"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="divide-y divide-border-subtle">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 h-10">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="w-32 h-3" />
              <Skeleton className="w-20 h-3" />
              <Skeleton className="flex-1 h-3" />
              <Skeleton className="w-14 h-5" />
              <Skeleton className="w-12 h-3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <p className="text-sm text-muted">Could not load live feed.</p>
          <button onClick={load} className="mt-2 text-xs text-accent hover:underline focus-visible:outline-none">
            Try again
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <p className="text-sm text-muted">No activity yet.</p>
          <p className="text-xs text-muted mt-1">Commit events will appear here once a repository is connected.</p>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          <AnimatePresence initial={false}>
            {events.map(event => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center gap-3 px-4 h-10 min-w-0"
              >
                <SeverityDot severity={event.severity} className="shrink-0" />
                <span className="text-xs font-mono text-secondary truncate w-36 shrink-0">
                  {event.repo}
                  <span className="text-muted">/{event.branch.split("/").pop()}</span>
                </span>
                <span className="text-xs text-muted truncate w-24 shrink-0 hidden sm:block">
                  {event.author}
                </span>
                <span className="flex-1 text-xs truncate">
                  {event.status === "blocked"
                    ? <span className="text-primary">{event.rule}</span>
                    : <span className="text-muted">Clean</span>}
                </span>
                <Badge variant={event.status === "blocked" ? "blocked" : "clean"} className="shrink-0" />
                <CopyableCode value={event.commitHash} className="hidden md:inline-flex shrink-0" />
                <span className="text-2xs text-muted shrink-0 w-16 text-right tabular">{event.time}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
