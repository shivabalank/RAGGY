/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Barlow', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#F5F3FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD', 400: '#A78BFA',
          500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9', 800: '#5B21B6', 900: '#4C1D95', 950: '#2E1065',
        },
      },
      boxShadow: {
        card: '0 24px 60px -16px rgba(46,16,101,.28), 0 2px 8px rgba(46,16,101,.06)',
        soft: '0 1px 2px rgba(24,24,27,.04), 0 4px 16px -4px rgba(76,29,149,.08)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        'dot': { '0%,80%,100%': { opacity: 0.25 }, '40%': { opacity: 1 } },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out',
        'slide-up': 'slide-up .35s cubic-bezier(.2,.8,.2,1)',
        'dot': 'dot 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};
