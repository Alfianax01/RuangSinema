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
          bg: '#0B0D12',
          surface: '#14171F',
          card: '#1A1E29',
          border: '#272B38',
          gold: '#F5B301',
          goldHover: '#E5A500',
          muted: '#8A92A6',
          mutedDark: '#4F566B',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px -5px rgba(245, 179, 1, 0.35)',
        'card-glow': '0 8px 30px rgba(0, 0, 0, 0.45)',
      }
    },
  },
  plugins: [],
}


