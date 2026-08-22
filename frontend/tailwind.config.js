/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        panel2: "var(--panel-2)",
        ink: "var(--ink)",
        ink2: "var(--ink-2)",
        ink3: "var(--ink-3)",
        line: "var(--line)",
        linestrong: "var(--line-strong)",
        up: "var(--up)",
        down: "var(--down)",
        warn: "var(--warn)",
      },
      fontFamily: {
        sans: [
          "Open Runde",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        serif: ["Newsreader", "Georgia", "Cambria", "serif"],
      },
      borderColor: {
        DEFAULT: "var(--line)",
      },
    },
  },
  plugins: [],
};
