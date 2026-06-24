/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F1F0FE',
          100: '#E4E2FD',
          200: '#C9C5FB',
          300: '#A8A1F8',
          400: '#8B82F3',
          500: '#5B5BD6', // primary
          600: '#4A47C4',
          700: '#3B38A0',
          800: '#2D2A7A',
          900: '#201D57',
        },
        accent: {
          rose: '#F43F5E',
          amber: '#F59E0B',
          emerald: '#10B981',
        },
        surface: {
          DEFAULT: '#FAFAFA',
          dark: '#0B0B0F',
          'dark-raised': '#141417',
          'dark-border': '#232328',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.4)', opacity: '0' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        'like-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.2s cubic-bezier(0.4,0,0.6,1) infinite',
        'like-pop': 'like-pop 0.35s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};
