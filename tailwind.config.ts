import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff4ed",
          100: "#ffe6d4",
          200: "#ffc9a8",
          300: "#ffa371",
          400: "#ff7238",
          500: "#fe4d11",
          600: "#ef3307",
          700: "#c62208",
          800: "#9d1d0f",
          900: "#7e1b10",
        },
      },
    },
  },
  plugins: [],
};

export default config;
