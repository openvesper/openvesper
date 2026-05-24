import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      // Colors are defined as CSS variables in globals.css.
      // Tailwind utility classes like `bg-bg`, `text-fg`, `text-accent`
      // are provided directly via globals.css.
      // This config just supports Tailwind's standard utilities
      // (padding, layout, flex, grid, etc.).
      fontFamily: {
        mono: [
          "ui-monospace",
          "SF Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Roboto Mono",
          "Cascadia Code",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
  // Important: prevent purging of utility classes used dynamically
  safelist: [
    "bg-bg",
    "bg-bg-elevated",
    "text-fg",
    "text-accent",
    "text-accent2",
    "text-muted",
    "border-border",
    "bg-accent",
    "bg-accent2",
  ],
};

export default config;
