import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { copyToClipboard } from "../../lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  copyable?: boolean;
  className?: string;
  maxHeight?: string;
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  highlightLines = [],
  copyable = true,
  className,
  maxHeight = "400px",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "relative rounded-card border border-border bg-raised overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <span className="text-2xs text-muted font-mono uppercase tracking-wider">
          {language ?? "code"}
        </span>
        {copyable && (
          <button
            onClick={handleCopy}
            aria-label="Copy code"
            className="flex items-center gap-1.5 text-2xs text-muted hover:text-secondary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded px-1.5 py-0.5"
          >
            {copied ? (
              <><Check size={12} className="text-accent" /> Copied</>
            ) : (
              <><Copy size={12} /> Copy</>
            )}
          </button>
        )}
      </div>

      {/* Code */}
      <div
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <pre className="p-4 text-xs font-mono leading-6 text-primary">
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const isHighlighted = highlightLines.includes(lineNum);
            return (
              <div
                key={i}
                className={cn(
                  "flex min-h-[24px] px-0",
                  isHighlighted && "bg-critical/10 -mx-4 px-4 border-l-2 border-critical"
                )}
              >
                {showLineNumbers && (
                  <span className="select-none text-muted w-8 shrink-0 text-right mr-4 font-tabular">
                    {lineNum}
                  </span>
                )}
                <span>{line}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

// Inline copyable hash / value
export function CopyableCode({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      title="Click to copy"
      className={cn(
        "font-mono text-2xs text-secondary hover:text-primary transition-colors duration-fast",
        "inline-flex items-center gap-1 cursor-pointer",
        className
      )}
    >
      {copied ? (
        <Check size={10} className="text-accent shrink-0" />
      ) : (
        <Copy size={10} className="shrink-0 opacity-50" />
      )}
      {value}
    </button>
  );
}
