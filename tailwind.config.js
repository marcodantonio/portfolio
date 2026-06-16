/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        "copy-muted": "var(--copy-muted)",
        panel: "var(--panel)",
        "panel-strong": "var(--panel-strong)",
        "panel-inverse": "var(--panel-inverse)",
        line: "var(--line)",
        "line-subtle": "var(--line-subtle)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        surface: "var(--surface)",
        background: "var(--background)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["var(--font-syne)", "Syne", "system-ui", "-apple-system"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        blinkCaret: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
      },
      animation: {
        "blink-caret": "blinkCaret 1s step-end infinite",
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
