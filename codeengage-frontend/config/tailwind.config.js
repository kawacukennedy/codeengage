/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/templates/**/*.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui'],
        'mono': ['JetBrains Mono Variable', 'JetBrains Mono', 'Fira Mono', 'monospace'],
        'display': ['Plus Jakarta Sans', 'Inter', 'system-ui']
      },
      colors: {
        'deep-space': '#0B0F19',
        'glass-surface': 'rgba(31, 41, 55, 0.5)',
        'neon-blue': '#00F0FF',
        'neon-purple': '#7000FF',
        'code-bg': '#0D1117',
        'code-highlight': '#1F2937',
        'code-comment': '#6B7280',
        'code-keyword': '#FF79C6',
        'code-string': '#F1FA8C',
        'code-number': '#BD93F9',
        'code-function': '#50FA7B'
      },
      backgroundImage: {
        'gradient-aurora': 'linear-gradient(to right, #00F0FF, #7000FF)',
        'gradient-dark': 'linear-gradient(to bottom, #0B0F19, #111827)'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'gradient': 'gradient 3s ease infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
        },
        gradient: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' }
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      },
      maxWidth: {
        '8xl': '88rem'
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neon': '0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(112, 0, 255, 0.3)'
      },
      backdropBlur: {
        'xs': '2px',
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
}