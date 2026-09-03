import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#0A0C10",      // page background
        surface: "#13161D",    // cards
        ink: "#E9ECF2",        // body text
        inkSoft: "#1A1F28",    // hover
        blue: "#1E88E5",       // BOIG blue
        blueDark: "#1565C0",
        gold: "#D4AF37",       // BOIG gold
        goldDark: "#B8912B",
        copper: "#D4AF37",     // legacy alias
        copperDark: "#B8912B",
        sage: "#4CC38A",
        danger: "#E36060",
      },
    },
  },
  plugins: [],
};
export default config;
