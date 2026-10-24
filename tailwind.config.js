/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        trading: {
          green: '#10b981',
          greenLight: '#d1fae5',
          greenDark: '#047857',
          red: '#ef4444',
          redLight: '#fee2e2',
          redDark: '#b91c1c',
          bgDark: '#0f172a',
          cardDark: '#1e293b',
          borderDark: '#334155'
        }
      }
    },
  },
  plugins: [],
}
