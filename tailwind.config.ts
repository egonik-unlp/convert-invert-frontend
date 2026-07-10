import type { Config } from "tailwindcss";

/** Wrap a CSS var as an alpha-capable color so `bg-primary/10` etc. resolve correctly. */
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
        border: withAlpha("border"),
        input: withAlpha("input"),
        ring: withAlpha("ring"),
        background: withAlpha("background"),
        foreground: withAlpha("foreground"),
        primary: {
          DEFAULT: withAlpha("primary"),
          foreground: withAlpha("primary-foreground"),
        },
        secondary: {
          DEFAULT: withAlpha("secondary"),
          foreground: withAlpha("secondary-foreground"),
        },
        destructive: {
          DEFAULT: withAlpha("destructive"),
          foreground: withAlpha("destructive-foreground"),
        },
        success: {
          DEFAULT: withAlpha("success"),
          foreground: withAlpha("success-foreground"),
        },
        warning: {
          DEFAULT: withAlpha("warning"),
          foreground: withAlpha("warning-foreground"),
        },
        info: {
          DEFAULT: withAlpha("info"),
          foreground: withAlpha("info-foreground"),
        },
        muted: {
          DEFAULT: withAlpha("muted"),
          foreground: withAlpha("muted-foreground"),
        },
        accent: {
          DEFAULT: withAlpha("accent"),
          foreground: withAlpha("accent-foreground"),
        },
        card: {
          DEFAULT: withAlpha("card"),
          foreground: withAlpha("card-foreground"),
        },
        popover: {
          DEFAULT: withAlpha("popover"),
          foreground: withAlpha("popover-foreground"),
        },
        sidebar: {
          DEFAULT: withAlpha("sidebar"),
          foreground: withAlpha("sidebar-foreground"),
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 3px)",
        sm: "calc(var(--radius) - 6px)",
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono Variable", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        focus: "0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring))",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "content-in": {
          from: { opacity: "0", transform: "translate(-50%, -48%) scale(0.97)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        indeterminate: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 160ms ease-out",
        "overlay-in": "overlay-in 160ms ease-out",
        "content-in": "content-in 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        "pop-in": "pop-in 140ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up-in": "slide-up-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        indeterminate: "indeterminate 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
