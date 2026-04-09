/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Gaming-Neon brand palette — single source of truth
        // Use these via className="text-neon-violet" etc.
        neon: {
          violet: "#7c3aed",
          "violet-light": "#a78bfa",
          yellow: "#facc15",
          green: "#22c55e",
        },
      },
    },
  },
  plugins: [],
};
