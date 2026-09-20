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
        "splat-fade": "splatFade 5.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-glow": "pulseGlow 2s infinite",
        "ticker": "ticker 20s linear infinite",
      },
      keyframes: {
        floatUp: {
          "0%": { transform: "translate3d(0, 0, 0) scale(0.5) rotate(0deg)", opacity: "0" },
          "8%": { transform: "translate3d(0, -6vh, 0) scale(1.3) rotate(-8deg)", opacity: "1" },
          "25%": { transform: "translate3d(-20px, -30vh, 0) scale(1.15) rotate(10deg)", opacity: "1" },
          "50%": { transform: "translate3d(24px, -65vh, 0) scale(1.05) rotate(-12deg)", opacity: "1" },
          "75%": { transform: "translate3d(-15px, -92vh, 0) scale(0.98) rotate(6deg)", opacity: "0.9" },
          "100%": { transform: "translate3d(10px, -118vh, 0) scale(0.85) rotate(-4deg)", opacity: "0" },
        },
        splatFade: {
          "0%": { transform: "scale(0.3) rotate(-12deg)", opacity: "0" },
          "6%": { transform: "scale(1.08) rotate(3deg)", opacity: "1" },
          "12%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
          "80%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
          "92%": { transform: "scale(1.03)", opacity: "0.8" },
          "100%": { transform: "scale(1.06) translateY(10px)", opacity: "0" },
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
