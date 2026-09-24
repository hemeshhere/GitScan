import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, GitBranch, AlertTriangle, ShieldCheck,
  Terminal, Puzzle, Settings, ChevronDown, Sun, Moon,
  LogOut, User, ChevronsUpDown,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useTheme } from "../../lib/theme";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/app",              label: "Overview",      icon: <LayoutDashboard size={16} /> },
  { to: "/app/repos",        label: "Repositories",  icon: <GitBranch size={16} /> },
  { to: "/app/findings",     label: "Findings",      icon: <AlertTriangle size={16} /> },
  { to: "/app/rules",        label: "Rules",          icon: <ShieldCheck size={16} /> },
  { to: "/app/playground",   label: "Playground",    icon: <Terminal size={16} /> },
  { to: "/app/integrations", label: "Integrations",  icon: <Puzzle size={16} /> },
  { to: "/app/settings",     label: "Settings",      icon: <Settings size={16} /> },
];

export function Sidebar() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [wsOpen, setWsOpen] = useState(false);

  return (
    <aside className="flex flex-col h-full w-60 border-r border-border bg-surface shrink-0">
      {/* Workspace switcher */}
      <div className="px-3 pt-4 pb-3 border-b border-border-subtle">
        <button
          onClick={() => setWsOpen(o => !o)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-btn hover:bg-raised transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent text-left"
        >
          {/* Logo mark */}
          <span className="w-5 h-5 rounded-[4px] bg-accent flex items-center justify-center shrink-0">
            <ShieldCheck size={12} className="text-bg" strokeWidth={2.5} />
          </span>
          <span className="flex-1 text-sm font-medium text-primary truncate">acme-org</span>
          <ChevronsUpDown size={14} className="text-muted shrink-0" />
        </button>
        {wsOpen && (
          <div className="mt-1 rounded-btn border border-border bg-raised p-1 text-xs">
            <button className="w-full text-left px-2 py-1.5 rounded hover:bg-surface text-secondary transition-colors duration-fast">
              acme-org
            </button>
            <button className="w-full text-left px-2 py-1.5 rounded hover:bg-surface text-muted transition-colors duration-fast">
              + Add workspace
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/app"}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-2.5 px-2.5 h-8 rounded-btn text-sm transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                isActive
                  ? "bg-raised text-primary font-medium"
                  : "text-secondary hover:bg-raised/60 hover:text-primary"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-accent" aria-hidden="true" />
                )}
                <span className={cn("shrink-0", isActive ? "text-primary" : "text-muted")}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: user + theme toggle */}
      <div className="px-2 pb-3 pt-2 border-t border-border-subtle space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="flex items-center gap-2.5 px-2.5 h-8 rounded-btn text-sm text-secondary hover:bg-raised hover:text-primary transition-colors duration-fast w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          {theme === "dark" ? <Sun size={16} className="text-muted" /> : <Moon size={16} className="text-muted" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        {/* User row */}
        <button className="flex items-center gap-2.5 px-2.5 h-8 rounded-btn text-sm text-secondary hover:bg-raised hover:text-primary transition-colors duration-fast w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent">
          <span className="w-5 h-5 rounded-full bg-raised border border-border flex items-center justify-center shrink-0">
            <User size={12} className="text-muted" />
          </span>
          <span className="flex-1 text-left truncate">sarah.chen</span>
          <LogOut size={14} className="text-muted" />
        </button>
      </div>
    </aside>
  );
}
