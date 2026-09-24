import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, BookOpen, LayoutDashboard, GitBranch, AlertTriangle, ShieldCheck, Puzzle, Settings, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const go = (path: string) => { navigate(path); onClose(); };

  const pages: CommandItem[] = [
    { id: "overview",     label: "Overview",      icon: <LayoutDashboard size={14} />, action: () => go("/app"),             group: "Pages" },
    { id: "repos",        label: "Repositories",  icon: <GitBranch size={14} />,       action: () => go("/app/repos"),        group: "Pages" },
    { id: "findings",     label: "Findings",      icon: <AlertTriangle size={14} />,   action: () => go("/app/findings"),     group: "Pages" },
    { id: "rules",        label: "Rules",          icon: <ShieldCheck size={14} />,     action: () => go("/app/rules"),        group: "Pages" },
    { id: "playground",   label: "Playground",    icon: <Terminal size={14} />,        action: () => go("/app/playground"),   group: "Pages" },
    { id: "integrations", label: "Integrations",  icon: <Puzzle size={14} />,          action: () => go("/app/integrations"), group: "Pages" },
    { id: "settings",     label: "Settings",      icon: <Settings size={14} />,        action: () => go("/app/settings"),     group: "Pages" },
    { id: "docs",         label: "Documentation", icon: <BookOpen size={14} />,        action: () => window.open("#", "_blank"), group: "Pages" },
  ];

  const filtered = query.trim()
    ? pages.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : pages;

  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const flatFiltered = Object.values(groups).flat();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown")  { e.preventDefault(); setSelected(s => Math.min(s + 1, flatFiltered.length - 1)); }
      else if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      else if (e.key === "Enter")     { e.preventDefault(); flatFiltered[selected]?.action(); }
      else if (e.key === "Escape")    { onClose(); }
    },
    [open, flatFiltered, selected, onClose]
  );

  useEffect(() => { window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown); }, [handleKeyDown]);
  useEffect(() => { if (!open) { setQuery(""); setSelected(0); } }, [open]);
  useEffect(() => { setSelected(0); }, [query]);

  let idx = -1;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-[20%] -translate-x-1/2 z-50 w-full max-w-[520px] bg-surface border border-border rounded-card overflow-hidden shadow-2xl"
            role="dialog" aria-label="Command palette"
          >
            <div className="flex items-center gap-2.5 px-4 border-b border-border h-12">
              <Search size={16} className="text-muted shrink-0" />
              <input
                autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search pages..."
                className="flex-1 bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
              />
              <kbd className="text-2xs text-muted border border-border rounded px-1.5 py-0.5 font-mono">Esc</kbd>
            </div>
            <div className="overflow-y-auto max-h-80 p-1">
              {flatFiltered.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">No results for "{query}"</p>
              ) : (
                Object.entries(groups).map(([group, items]) => (
                  <div key={group}>
                    <p className="text-2xs text-muted uppercase tracking-wider px-3 py-2 mt-1">{group}</p>
                    {items.map(item => {
                      idx++;
                      const isSelected = idx === selected;
                      return (
                        <button key={item.id} onClick={item.action}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-btn text-sm text-left transition-colors duration-fast",
                            isSelected ? "bg-raised text-primary" : "text-secondary hover:bg-raised hover:text-primary"
                          )}
                        >
                          <span className="text-muted shrink-0">{item.icon}</span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {isSelected && <ArrowRight size={12} className="text-muted shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border px-4 py-2 flex items-center gap-4">
              <span className="text-2xs text-muted"><kbd className="font-mono border border-border rounded px-1 mr-1">↑↓</kbd>navigate</span>
              <span className="text-2xs text-muted"><kbd className="font-mono border border-border rounded px-1 mr-1">↵</kbd>open</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
