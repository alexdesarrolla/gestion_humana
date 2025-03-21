/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'gradient-y': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'top center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'bottom center'
          }
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': '0% 0%'
          },
          '25%': {
            'background-size': '200% 200%',
            'background-position': '100% 0%'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': '100% 100%'
          },
          '75%': {
            'background-size': '200% 200%',
            'background-position': '0% 100%'
          }
        }
      },
    },
  },
  plugins: [],
};