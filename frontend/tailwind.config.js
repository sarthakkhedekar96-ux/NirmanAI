/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#0f172a',       // Slate 900
          navyLight: '#1e293b',  // Slate 800
          blue: '#0284c7',       // Sky 600
          cyan: '#06b6d4',       // Cyan 500
          blueLight: '#f0f9ff',  // Sky 50
          amber: '#d97706',      // Amber 600
          saffron: '#ea580c',    // Orange 600
          grayBg: '#f8fafc',     // Slate 50 background
          cardBg: '#ffffff',
          border: '#cff4fc',     // Light cyan border
        },
        cyanBrand: {
          50: '#ecfeff',
          100: '#cff4fc',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        risk: {
          normalBg: '#ecfdf5',
          normalText: '#047857',
          normalBorder: '#a7f3d0',
          watchlistBg: '#fefce8',
          watchlistText: '#a16207',
          watchlistBorder: '#fef08a',
          highBg: '#fff7ed',
          highText: '#c2410c',
          highBorder: '#ffedd5',
          criticalBg: '#fef2f2',
          criticalText: '#b91c1c',
          criticalBorder: '#fecaca',
        }
      }
    },
  },
  plugins: [],
}
