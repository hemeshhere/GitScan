import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface Line {
  text: string;
  delay: number;
  type: "normal" | "blocked" | "success" | "meta";
}

const terminalLines: Line[] = [
  { text: "$ git commit -m 'update prod config'", delay: 0, type: "normal" },
  { text: "Scanning diff... 1 file changed, 3 insertions(+)", delay: 800, type: "meta" },
  { text: "Checking 512 rules against changes...", delay: 1600, type: "meta" },
  { text: "", delay: 2400, type: "normal" },
  { text: "  BLOCKED  aws-access-key-id  config/prod.env:14", delay: 2600, type: "blocked" },
  { text: "  ↳ AKIA****EXAMPLE found in tracked file", delay: 3000, type: "blocked" },
  { text: "", delay: 3400, type: "normal" },
  { text: "Slack alert sent to #security", delay: 3600, type: "success" },
  { text: "Commit blocked. Rotate the key and remove it from history.", delay: 4200, type: "meta" },
];

export function Terminal({ className }: { className?: string }) {
  const [visibleLines, setVisibleLines] = useState<Line[]>([]);
  const [started, setStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), 600);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!started) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    terminalLines.forEach((line, i) => {
      const t = setTimeout(() => {
        setVisibleLines(prev => [...prev, line]);
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, line.delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [started]);

  return (
    <div
      className={cn(
        "rounded-card border border-border bg-[#0d0d0f] overflow-hidden font-mono text-xs",
        className
      )}
    >
      {/* Terminal title bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-raised">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-2xs text-muted">gitscan — pre-commit hook</span>
      </div>

      {/* Output area */}
      <div
        ref={containerRef}
        className="p-4 space-y-1 min-h-[200px] overflow-auto"
      >
        {visibleLines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "leading-5",
              line.type === "normal"   && "text-[#EDEDEF]",
              line.type === "meta"     && "text-[#71717A]",
              line.type === "blocked"  && "text-[#E5484D]",
              line.type === "success"  && "text-[#3ECF8E]"
            )}
          >
            {line.text || "\u00A0"}
          </motion.div>
        ))}
        {started && visibleLines.length < terminalLines.length && (
          <span className="inline-block w-2 h-3.5 bg-[#EDEDEF] animate-pulse" />
        )}
      </div>
    </div>
  );
}
