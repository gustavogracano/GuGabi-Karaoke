import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          pink: "#ff007f",
          purple: "#9d4edd",
          cyan: "#00f0ff",
          yellow: "#ffea00",
          green: "#00ff66",
        },
        stage: {
          dark: "#0a0a12",
          card: "rgba(20, 20, 35, 0.75)",
          border: "rgba(255, 255, 255, 0.12)",
        },
      },
      animation: {
        "float-up": "floatUp 3.2s cubic-bezier(0.25, 1, 0.5, 1) both",
        "splat-fade": "splatFade 2.5s ease-out forwards",
        "pulse-glow": "pulseGlow 2s infinite",
        "ticker": "ticker 20s linear infinite",
      },
      keyframes: {
        floatUp: {
          "0%": { transform: "translate3d(0, 0, 0) scale(0.6)", opacity: "0" },
          "6%": { transform: "translate3d(0, -5vh, 0) scale(1.2)", opacity: "1" },
          "25%": { transform: "translate3d(-14px, -28vh, 0) scale(1.1)", opacity: "1" },
          "55%": { transform: "translate3d(16px, -62vh, 0) scale(1.05)", opacity: "1" },
          "80%": { transform: "translate3d(-10px, -90vh, 0) scale(0.95)", opacity: "0.85" },
          "100%": { transform: "translate3d(0, -118vh, 0) scale(0.8)", opacity: "0" },
        },
        splatFade: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "15%": { transform: "scale(1.05)", opacity: "0.95" },
          "30%": { transform: "scale(1)", opacity: "0.95" },
          "80%": { opacity: "0.9" },
          "100%": { opacity: "0", transform: "scale(1.1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(255, 0, 127, 0.4)" },
          "50%": { boxShadow: "0 0 30px rgba(0, 240, 255, 0.7)" },
        },
        ticker: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
      boxShadow: {
        "neon-pink": "0 0 20px rgba(255, 0, 127, 0.5)",
        "neon-cyan": "0 0 20px rgba(0, 240, 255, 0.5)",
        "neon-purple": "0 0 20px rgba(157, 78, 221, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
