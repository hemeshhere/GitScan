import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "../features/CommandPalette";
import { cn } from "../../lib/utils";

export function AppShell() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-bg/60 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <button
        className="fixed top-3 left-3 z-40 lg:hidden p-1.5 rounded-btn border border-border bg-surface text-secondary hover:text-primary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        onClick={() => setMobileSidebarOpen(o => !o)}
        aria-label="Toggle navigation"
      >
        {mobileSidebarOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:relative z-30 lg:z-auto h-full transition-transform duration-200",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet context={{ openCmdPalette: () => setCmdOpen(true) }} />
      </main>

      {/* Command palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
