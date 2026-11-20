/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          soft: '#EFF6FF',
        },
        navy: {
          DEFAULT: '#061A3A',
          deep: '#030E1F',
          soft: '#EEF2F6',
        },
        blue: {
          DEFAULT: '#2563EB',
          soft: '#EFF6FF',
          hover: '#1D4ED8',
        },
        cyan: {
          DEFAULT: '#21EAF4',
          soft: '#E0FBFC',
        },
        mist: '#F5F7FA',
        canvas: '#F8FAFC',
        line: '#E2E8F0',
        hairline: '#E9EEF5',
        well: '#F1F5FA',
        'hero-tint': '#D9ECFF',
        track: '#EAF0F8',
        ink: '#5B6B85',
        'faded-ink': '#7D8AA0',
        'muted-text': '#8A99AD',
        success: {
          DEFAULT: '#14B87A',
          text: '#0A8F5C',
          soft: '#ECFDF5',
        },
        danger: {
          DEFAULT: '#E5484D',
          text: '#C9353A',
          soft: '#FEF2F2',
        },
        warning: {
          DEFAULT: '#F5A524',
          text: '#A56A00',
          soft: '#FFFBEB',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '2rem',
        '5xl': '2.5rem',
        well: '14px',
        row: '16px',
        card: '16px',
        hero: '20px',
        pill: '9999px',
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        card: '0 1px 3px 0 rgba(6, 26, 58, 0.04), 0 1px 2px -1px rgba(6, 26, 58, 0.03)',
        hero: '0 4px 20px -4px rgba(6, 26, 58, 0.06)',
        pill: '0 2px 6px 0 rgba(6, 26, 58, 0.06)',
        nav: '0 4px 20px -4px rgba(6, 26, 58, 0.08)',
        dropdown: '0 10px 25px -5px rgba(6, 26, 58, 0.1), 0 8px 10px -6px rgba(6, 26, 58, 0.06)',
        'glass-dark': '0 8px 32px 0 rgba(3,13,31,0.37)',
        'glass-light': '0 4px 24px 0 rgba(6,26,58,0.08)',
      },
      fontFamily: {
        sans: ['Cairo', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        cairo: ['Cairo', 'sans-serif'],
        arabic: ['Cairo', 'sans-serif'],
      },
      backgroundImage: {
        'navy-gradient': 'linear-gradient(180deg, #092147 0%, #061A3A 55%, #030D1F 100%)',
        'navy-gradient-elevated': 'linear-gradient(180deg, #0B244D 0%, #061A3A 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
