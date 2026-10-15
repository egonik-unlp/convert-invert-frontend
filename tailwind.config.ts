import type { Config } from "tailwindcss";

/** Wrap a CSS var as an alpha-capable color so `bg-accent/10` etc. resolve correctly. */
const withAlpha = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: withAlpha("background"),
        foreground: withAlpha("foreground"),
        raised: withAlpha("raised"),
        hover: withAlpha("hover"),
        line: withAlpha("line"),
        faint: withAlpha("faint"),
        ok: withAlpha("ok"),
        bad: withAlpha("bad"),
        accent: {
          DEFAULT: withAlpha("accent"),
          foreground: withAlpha("accent-foreground"),
        },
        muted: {
          DEFAULT: withAlpha("raised"),
          foreground: withAlpha("muted-foreground"),
        },
      },
      borderRadius: {
        lg: "8px",
        md: "var(--radius)",
        sm: "4px",
      },
      fontFamily: {
        sans: ["Archivo", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", "1.35"],
        xs: ["12px", "1.4"],
        sm: ["13px", "1.4"],
        base: ["15px", "1.35"],
        xl: ["24px", "1.15"],
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-right": { from: { transform: "translateX(16px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        "slide-in-left": { from: { transform: "translateX(-100%)" }, to: { transform: "none" } },
        "pop-in": { from: { opacity: "0", transform: "translate(-50%, -48%) scale(0.98)" }, to: { opacity: "1", transform: "translate(-50%, -50%)" } },
        indeterminate: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(300%)" } },
      },
      animation: {
        "fade-in": "fade-in 140ms ease-out",
        "slide-in-right": "slide-in-right 160ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left": "slide-in-left 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        "pop-in": "pop-in 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        indeterminate: "indeterminate 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
