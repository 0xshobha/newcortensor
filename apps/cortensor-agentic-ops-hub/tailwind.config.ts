import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0a0a0f",
                surface: "#0f0f1a",
                "surface-2": "#141428",
                border: "#1a1a2e",
                "border-bright": "#2a2a4e",
                primary: "#00ff88",
                "primary-dim": "#00cc6a",
                "primary-glow": "#00ff8820",
                accent: "#7c3aed",
                "accent-glow": "#7c3aed20",
                danger: "#ff3366",
                "danger-glow": "#ff336620",
                warning: "#ffaa00",
                muted: "#6b7280",
                "text-primary": "#e2e8f0",
                "text-secondary": "#94a3b8",
            },
            fontFamily: {
                mono: ["'JetBrains Mono'", "Consolas", "monospace"],
                sans: ["'Inter'", "system-ui", "sans-serif"],
            },
            animation: {
                "pulse-green": "pulseGreen 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "fade-in": "fadeIn 0.3s ease-in-out",
                "slide-up": "slideUp 0.3s ease-out",
                "blink": "blink 1s step-end infinite",
                "scan": "scan 3s linear infinite",
            },
            keyframes: {
                pulseGreen: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.4" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { transform: "translateY(8px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                blink: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0" },
                },
                scan: {
                    "0%": { transform: "translateY(-100%)" },
                    "100%": { transform: "translateY(100vh)" },
                },
            },
            boxShadow: {
                "green-glow": "0 0 20px rgba(0, 255, 136, 0.15)",
                "red-glow": "0 0 20px rgba(255, 51, 102, 0.15)",
                "purple-glow": "0 0 20px rgba(124, 58, 237, 0.15)",
                "cyber": "inset 0 1px 0 rgba(255,255,255,0.05)",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};

export default config;
