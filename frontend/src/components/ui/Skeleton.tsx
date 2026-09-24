import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
  rows?: number;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-raised",
        className
      )}
      aria-hidden="true"
    />
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border-subtle">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 h-10">
          <Skeleton className="w-14 h-4" />
          <Skeleton className="w-40 h-4" />
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-4 ml-auto" />
          <Skeleton className="w-16 h-4" />
        </div>
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="p-5 rounded-card border border-border">
      <Skeleton className="w-24 h-3 mb-3" />
      <Skeleton className="w-16 h-8 mb-2" />
      <Skeleton className="w-12 h-3" />
    </div>
  );
}
