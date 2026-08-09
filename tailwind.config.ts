import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#0A0C10",      // fondo negro
        surface: "#13161D",    // tarjetas
        ink: "#E9ECF2",        // texto claro
        inkSoft: "#1A1F28",    // hover
        blue: "#1E88E5",       // azul BOIG
        blueDark: "#1565C0",
        gold: "#D4AF37",       // dorado BOIG
        goldDark: "#B8912B",
        copper: "#D4AF37",     // alias para compatibilidad
        copperDark: "#B8912B",
        sage: "#4CC38A",
        danger: "#E36060",
      },
    },
  },
  plugins: [],
};
export default config;
