import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
        // Administration Register typography only (Arogya HMS design spec)
        // — applied solely within the .admin-register scope, never globally.
        archivo: ["var(--font-archivo)", "ui-sans-serif", "system-ui", "sans-serif"],
        plexmono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // MediTrack's primary brand color — the same warm olive used by the
        // Administration Register, now the ONE consistent accent across
        // OPD, IPD, and Admin (previously teal). Expanded into a full tonal
        // scale so it can be used like any other Tailwind color
        // (bg-brand-50 ... bg-brand-950). Additive only — doesn't touch
        // PawTrack's theme, which never references "brand-*".
        brand: {
          50: "#F5F6EF",
          100: "#E8EBD9",
          200: "#D3D9B8",
          300: "#B8C28E",
          400: "#97A566",
          500: "#78894A",
          600: "#5B6B3F",
          700: "#434F2E",
          800: "#363F26",
          900: "#2C331F",
          950: "#1A1F12",
        },
        // MediTrack's "Administration Register" — pixel-exact tokens from
        // the Arogya HMS design spec (ward bed-chart / registrar-ledger
        // aesthetic). Scoped entirely to /admin/* — OPD and IPD keep the
        // earlier `brand` olive scale until their own matching redesign.
        adminreg: {
          bg: "#EAE6D6",
          card: "#F1EDDF",
          header: "#DED9C4", // header bars / table header row
          border: "#CBC3A8", // structural border (cards, tables, inputs)
          divider: "#DAD3B8", // row dividers
          sidebar: "#1E1E16",
          "sidebar-border": "#34342A",
          "sidebar-text": {
            DEFAULT: "#D9D4BF",
            secondary: "#C4BEA0",
            muted: "#8C8768",
          },
          text: "#24241C",
          muted: "#5F5B45",
          muted2: "#6B6650",
          olive: {
            DEFAULT: "#5A6B36", // primary button / active border+fill
            dark: "#3A4A28", // primary button border / positive text
            soft: "#E4E9D6", // positive / active / vacant background
            // Back-compat aliases for pages not yet retrofitted to the new
            // spec — remove once every admin page uses `dark`/`DEFAULT` directly.
            600: "#4F5E36",
            700: "#3A4A28",
          },
          // OPD's module accent — same base register tokens (bg/card/border/
          // text/amber/red), just its own primary color, per the unified
          // shell spec (Admin=olive, OPD=indigo, IPD reserved=oxblood).
          indigo: {
            DEFAULT: "#33456E",
            dark: "#24314F",
            soft: "#DCE1EC",
          },
          ipd: {
            DEFAULT: "#6B2E3A", // reserved for IPD's future module accent
          },
          amber: {
            DEFAULT: "#A97A2E",
            text: "#7A5A1E",
            soft: "#F3E6C9",
          },
          red: {
            DEFAULT: "#8B3A2E",
            text: "#6E2E24",
            soft: "#F0DAD4",
          },
          occupied: {
            bg: "#EDE7D5", // neutral (not positive/negative) — occupied bed
            border: "#CBC3A8",
            text: "#5A5640",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
