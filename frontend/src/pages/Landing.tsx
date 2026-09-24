import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Copy, Check, ArrowRight, ChevronRight } from "lucide-react";
import { Terminal } from "../components/features/Terminal";
import { RepoScanner } from "../components/features/RepoScanner";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/utils";

function Nav() {
  return (
    <nav className="border-b border-border-subtle bg-bg/80 backdrop-blur-md sticky top-0 z-20" aria-label="Main">
      <div className="max-w-content mx-auto flex items-center justify-between h-14 px-6">
        {/* Wordmark */}
        <Link to="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded">
          <span className="w-6 h-6 rounded-[5px] bg-accent flex items-center justify-center">
            <ShieldCheck size={14} className="text-bg" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-semibold text-primary tracking-tight">GitScan</span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#product" className="text-sm text-secondary hover:text-primary transition-colors duration-fast">Product</a>
          <a href="#rules" className="text-sm text-secondary hover:text-primary transition-colors duration-fast">Rules</a>
          <a href="#docs" className="text-sm text-secondary hover:text-primary transition-colors duration-fast">Docs</a>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          
          <Link to="/app">
            <Button variant="primary" size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function CopyableInstall({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="inline-flex items-center gap-3 bg-raised border border-border rounded-card px-4 py-3">
      <code className="font-mono text-sm text-secondary">{cmd}</code>
      <button
        onClick={copy}
        aria-label="Copy install command"
        className="text-muted hover:text-secondary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded p-0.5"
      >
        {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

const steps = [
  {
    num: "01",
    title: "Commit",
    desc: "Developer pushes code. GitScan hooks into the pre-commit or webhook event.",
  },
  {
    num: "02",
    title: "Scan",
    desc: "Diff is scanned against 500+ rules in under 50ms. No code leaves your network.",
  },
  {
    num: "03",
    title: "Block",
    desc: "If a secret is found, the commit is rejected before it reaches the remote.",
  },
  {
    num: "04",
    title: "Alert",
    desc: "Your team gets a Slack alert with the file, line, and remediation steps.",
  },
];

const providers = [
  { name: "AWS", count: 6 },
  { name: "GCP", count: 5 },
  { name: "Stripe", count: 4 },
  { name: "GitHub", count: 5 },
  { name: "Slack", count: 3 },
  { name: "Twilio", count: 3 },
  { name: "SendGrid", count: 1 },
  { name: "Mailchimp", count: 1 },
  { name: "NPM", count: 1 },
  { name: "Docker", count: 1 },
  { name: "JWT", count: 2 },
  { name: "SSH keys", count: 2 },
  { name: "Postgres", count: 1 },
  { name: "MongoDB", count: 1 },
  { name: "Redis", count: 1 },
  { name: "OpenAI", count: 2 },
];

const capabilities = [
  "Scans diffs, not full files — 10× faster than alternatives",
  "Blocks commits at the pre-commit hook before network write",
  "512 rules across 40+ providers, updated weekly",
  "Custom rules with live regex testing",
  "Allowlist by path, comment annotation, or commit hash",
  "Severity tiers: critical, high, medium, low",
  "Per-repo risk score updated on every scan",
  "Slack alerts with Block Kit formatting and one-click resolve",
  "GitHub, GitLab, and Bitbucket webhook support",
  "Audit log of every scan decision",
];

const tablePreviewRows = [
  { sev: "critical", rule: "AWS Access Key ID", file: "config/prod.env:14", repo: "payments-api", time: "3 min ago" },
  { sev: "critical", rule: "Stripe Live Secret Key", file: "src/billing/stripe-client.ts:3", repo: "payments-api", time: "12 min ago" },
  { sev: "high", rule: "GitHub PAT", file: "scripts/deploy.sh:8", repo: "infra-terraform", time: "1 hr ago" },
  { sev: "high", rule: "Slack Bot Token", file: "integrations/slack/notifier.py:11", repo: "web-dashboard", time: "2 hrs ago" },
  { sev: "medium", rule: "Database Connection URL", file: "src/db/connection.ts:2", repo: "payments-api", time: "8 hrs ago" },
];

const sevColor: Record<string, string> = {
  critical: "text-critical",
  high: "text-high",
  medium: "text-medium",
  low: "text-low",
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      {/* Hero */}
      <section className="max-w-content mx-auto px-6 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-semibold text-primary mb-4 max-w-[460px]">
              Stop secrets before they reach your repo.
            </h1>
            <p className="text-md text-secondary mb-8 max-w-[400px] leading-relaxed">
              GitScan hooks into your Git workflow, scans every commit against 500+ rules, and blocks leaks in under 50ms.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Link to="/app">
                <Button variant="primary" size="lg">
                  Get started <ArrowRight size={14} />
                </Button>
              </Link>
              <Link to="/app">
                <Button variant="secondary" size="lg">
                  View dashboard
                </Button>
              </Link>
            </div>

            <RepoScanner className="mt-6 max-w-[500px]" />
          </motion.div>

          {/* Right: terminal */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Terminal />
          </motion.div>
        </div>
      </section>

      {/* Monospace strip */}
      <div className="border-y border-border-subtle py-3 bg-surface">
        <p className="text-center font-mono text-xs text-muted tracking-widest">
          512 rules&nbsp;&nbsp;|&nbsp;&nbsp;&lt;50ms per commit&nbsp;&nbsp;|&nbsp;&nbsp;GitHub&nbsp;&nbsp;·&nbsp;&nbsp;GitLab&nbsp;&nbsp;·&nbsp;&nbsp;Slack
        </p>
      </div>

      {/* How it works */}
      <section id="product" className="max-w-content mx-auto px-6 py-20">
        <h2 className="text-lg font-semibold text-primary mb-10">How it works</h2>

        <div className="relative flex flex-col md:flex-row gap-0">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-5 left-0 right-0 h-px bg-border" />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.2, delay: i * 0.06 }}
              className="relative flex-1 pt-0 md:pr-8 pb-6 md:pb-0"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-xs text-muted relative z-10 bg-bg pr-2">{step.num}</span>
                <span className="text-sm font-medium text-primary">{step.title}</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature split */}
      <section className="border-t border-border-subtle">
        <div className="max-w-content mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: capabilities */}
            <div>
              <h2 className="text-lg font-semibold text-primary mb-6">Everything you need to secure your codebase.</h2>
              <ul className="space-y-2.5">
                {capabilities.map((cap, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-secondary">
                    <span className="text-accent shrink-0 mt-0.5">
                      <ChevronRight size={14} />
                    </span>
                    {cap}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: mock findings table */}
            <div className="rounded-card border border-border bg-surface overflow-hidden">
              <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-medium text-primary">Findings</span>
                <span className="text-2xs text-muted font-tabular">5 open</span>
              </div>
              {/* Table header */}
              <div className="grid grid-cols-[80px_1fr_1fr_80px] border-b border-border-subtle px-4 py-2">
                {["Severity", "Rule", "Repo", "Age"].map(h => (
                  <span key={h} className="text-2xs text-muted uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {/* Rows */}
              {tablePreviewRows.map((row, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_1fr_80px] items-center px-4 h-10 border-b border-border-subtle last:border-0 hover:bg-raised transition-colors duration-fast">
                  <span className={cn("text-2xs font-medium uppercase", sevColor[row.sev])}>{row.sev}</span>
                  <span className="text-xs text-primary truncate pr-2">{row.rule}</span>
                  <span className="font-mono text-2xs text-muted truncate">{row.repo}</span>
                  <span className="text-2xs text-muted font-tabular">{row.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rule coverage */}
      <section id="rules" className="border-t border-border-subtle bg-surface">
        <div className="max-w-content mx-auto px-6 py-16">
          <h2 className="text-lg font-semibold text-primary mb-2">Rule coverage</h2>
          <p className="text-xs text-muted mb-8">
            512 rules across 40+ providers. Updated weekly.
            <Link to="/app/rules" className="text-accent hover:underline ml-1">Browse all rules →</Link>
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {providers.map(p => (
              <div key={p.name} className="flex items-baseline gap-1.5">
                <span className="font-mono text-xs text-secondary">{p.name}</span>
                <span className="font-mono text-2xs text-muted font-tabular">{p.count}</span>
              </div>
            ))}
            <span className="font-mono text-xs text-muted">+ 30 more</span>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-border-subtle bg-surface">
        <div className="max-w-content mx-auto px-6 py-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-[4px] bg-accent flex items-center justify-center">
              <ShieldCheck size={11} className="text-bg" strokeWidth={2.5} />
            </span>
            <span className="text-xs font-medium text-secondary">GitScan</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-2xs text-muted hover:text-secondary transition-colors duration-fast">Privacy</a>
            <a href="#" className="text-2xs text-muted hover:text-secondary transition-colors duration-fast">Terms</a>
            <a href="#" className="text-2xs text-muted hover:text-secondary transition-colors duration-fast">Security</a>
            <a href="#" className="text-2xs text-muted hover:text-secondary transition-colors duration-fast">Status</a>
          </div>
          <span className="text-2xs text-muted font-tabular">2026 GitScan, Inc.</span>
        </div>
      </footer>
    </div>
  );
}
