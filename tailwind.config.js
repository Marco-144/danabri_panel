/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#293a42",
        secondary: "#B7C9D2",
        accent: "#E0896C",
        slidehover: "#33464f",
        background: "#EFF3F5",
        activo: "#7B9E8F",
        inactivo: "#B34D51",
        third: "#82949C",

        // extras útiles para UI
        border: "#E5E7EB",
        muted: "#6B7280",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};

