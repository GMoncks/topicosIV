/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#A020F0',
          purpleDark: '#5c0f8e',
          green: '#1F4D36', /* Cor secundária alterada de #BFE7D2 para #1F4D36 */
          greenLight: '#2e7d56',
          bg: '#050508', /* Muito escuro, quase preto */
          surface: '#111116',
          card: '#1a1a24'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'], /* Fonte gamer para títulos */
      }
    },
  },
  plugins: [],
}
