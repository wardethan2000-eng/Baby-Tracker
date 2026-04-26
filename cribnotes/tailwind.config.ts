import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0b1120",
        surface: "#161f33",
        elevated: "#1e2d47",
        primary: "#38bdf8",
        secondary: "#818cf8",
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#ef4444",
        "text-primary": "#f0f6ff",
        "text-secondary": "#94a3b8",
        "text-muted": "#475569",
        border: "#1e3a5f",
      },
      fontFamily: {
        display: ["DM Sans", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
export default config;