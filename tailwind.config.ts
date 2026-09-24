import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "gates-sm": "0.5rem",
        "gates-md": "1rem",
        "gates-lg": "1.5rem",
        "gates-xl": "2rem",
        "gates-full": "999px",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        gates: {
          canvas: "hsl(var(--gates-bg-canvas))",
          surface: "hsl(var(--gates-bg-surface))",
          subtle: "hsl(var(--gates-bg-subtle))",
          accent: "hsl(var(--gates-bg-accent))",
          warm: "hsl(var(--gates-bg-warm))",
          lilac: "hsl(var(--gates-bg-lilac))",
          brand: "hsl(var(--gates-bg-brand))",
          pressed: "hsl(var(--gates-bg-pressed))",
          "text-primary": "hsl(var(--gates-text-primary))",
          "text-secondary": "hsl(var(--gates-text-secondary))",
          "text-brand": "hsl(var(--gates-text-brand))",
          "text-inverse": "hsl(var(--gates-text-inverse))",
          border: "hsl(var(--gates-border-default))",
          "border-focus": "hsl(var(--gates-border-focus))",
          error: "hsl(var(--gates-status-error))",
          "error-bg": "hsl(var(--gates-status-error-bg))",
          warning: "hsl(var(--gates-status-warning))",
          "warning-bg": "hsl(var(--gates-status-warning-bg))",
          success: "hsl(var(--gates-status-success))",
          "success-bg": "hsl(var(--gates-status-success-bg))",
          "info-bg": "hsl(var(--gates-status-info-bg))",
        },
      },
      boxShadow: {
        "gates-card": "0 4px 24px 0 rgba(36, 48, 38, 0.035)",
        "gates-floating": "0 8px 32px 0 rgba(36, 48, 38, 0.1)",
      },
      keyframes: {
        "caret-blink": {
          "0%, 70%, 100%": { opacity: "1" },
          "20%, 50%": { opacity: "0" },
        },
      },
      animation: {
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
