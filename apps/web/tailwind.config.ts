import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border, 217 19% 27%))",
        background: "hsl(var(--background, 222 47% 11%))",
        foreground: "hsl(var(--foreground, 210 40% 98%))",
        ops: {
          surface: "#0f172a",
          card: "#1e293b",
          border: "#334155",
          accent: "#38bdf8",
          conflict: "#ef4444",
          success: "#10b981",
          warning: "#f59e0b"
        }
      }
    }
  },
  plugins: []
};

export default config;
