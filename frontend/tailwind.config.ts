import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["12px", { lineHeight: "16px" }],
        xs:   ["13px", { lineHeight: "20px" }],
        sm:   ["14px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "22px" }],
        md:   ["16px", { lineHeight: "24px" }],
        lg:   ["20px", { lineHeight: "28px" }],
        xl:   ["28px", { lineHeight: "36px", letterSpacing: "-0.02em" }],
        "2xl":["44px", { lineHeight: "52px", letterSpacing: "-0.02em" }],
      },
      colors: {
        // Background scale
        bg:           "var(--bg)",
        surface:      "var(--surface)",
        raised:       "var(--raised)",
        border:       "var(--border)",
        "border-subtle": "var(--border-subtle)",

        // Text scale
        primary:      "var(--text-primary)",
        secondary:    "var(--text-secondary)",
        muted:        "var(--text-muted)",

        // Accent
        accent:       "var(--accent)",
        "accent-dim": "var(--accent-dim)",

        // Severity
        critical:     "var(--critical)",
        high:         "var(--high)",
        medium:       "var(--medium)",
        low:          "var(--low)",

        // Status surfaces
        "critical-bg": "var(--critical-bg)",
        "high-bg":     "var(--high-bg)",
        "medium-bg":   "var(--medium-bg)",
        "low-bg":      "var(--low-bg)",
      },
      spacing: {
        "4.5": "18px",
        "18": "72px",
        "60": "240px",
      },
      borderRadius: {
        card:   "8px",
        input:  "8px",
        btn:    "6px",
        badge:  "6px",
        full:   "999px",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
      },
      transitionTimingFunction: {
        "ease-out-smooth": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%":   { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.3" },
        },
        "slide-down": {
          "0%":   { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up":        "fade-up 200ms ease-out both",
        "slide-in-right": "slide-in-right 200ms ease-out both",
        "pulse-dot":      "pulse-dot 2s ease-in-out infinite",
        "slide-down":     "slide-down 200ms ease-out both",
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
