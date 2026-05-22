/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16211d",
        surface: "#f7f5f0",
        line: "#ddd8cd",
        ledger: "#256d63",
        alert: "#a14f36",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 60px rgba(22, 33, 29, 0.08)",
      },
    },
  },
  plugins: [],
};
