/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Semantic ink: near-black in light mode, near-white in dark mode.
        // Alpha steps of ink replace the fixed slate ramp (see index.css).
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-contrast": "rgb(var(--ink-contrast) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      borderRadius: {
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      boxShadow: {
        // Soft drop + a hairline top highlight that sells the glass edge.
        glass:
          "0 12px 32px -12px rgb(50 60 90 / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.9)",
        "glass-lg":
          "0 24px 60px -18px rgb(50 60 90 / 0.28), inset 0 1px 0 rgb(255 255 255 / 0.95)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-up": {
          from: { opacity: "0", transform: "translateY(48px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(6%, -4%) scale(1.12)" },
          "100%": { transform: "translate(-5%, 5%) scale(0.95)" },
        },
        "pulse-alert": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        // Very slow wander so a static clock can't burn into the panel.
        "screensaver-drift": {
          "0%": { transform: "translate(-16vw, -12vh)" },
          "25%": { transform: "translate(15vw, -7vh)" },
          "50%": { transform: "translate(11vw, 11vh)" },
          "75%": { transform: "translate(-13vw, 8vh)" },
          "100%": { transform: "translate(-16vw, -12vh)" },
        },
      },
      animation: {
        rise: "rise 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "sheet-up": "sheet-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "drift-slow": "drift 50s ease-in-out infinite alternate",
        "drift-slower": "drift 70s ease-in-out infinite alternate-reverse",
        "pulse-alert": "pulse-alert 1.1s ease-in-out infinite",
        "screensaver-drift": "screensaver-drift 300s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
