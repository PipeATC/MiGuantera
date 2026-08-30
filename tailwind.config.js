/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Estructura / autoridad
        primary: {
          DEFAULT: '#0F172A',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        // Superficies
        canvas: '#F7F9FB',
        // Semánticos de estado
        vigente: {
          DEFAULT: '#10B981',
          soft: '#D1FAE5',
          dark: '#065F46',
        },
        porvencer: {
          DEFAULT: '#F59E0B',
          soft: '#FEF3C7',
          dark: '#92400E',
        },
        vencido: {
          DEFAULT: '#EF4444',
          soft: '#FEE2E2',
          dark: '#991B1B',
        },
        // Verde de marca (logo)
        brand: {
          DEFAULT: '#10B981',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '26px', fontWeight: '500' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '700' }],
        'data-mono': ['14px', { lineHeight: '20px', letterSpacing: '0.02em', fontWeight: '600' }],
      },
      borderRadius: {
        xl: '1.5rem',
        lg: '1rem',
        md: '0.75rem',
      },
      boxShadow: {
        card: '0px 4px 20px rgba(15, 23, 42, 0.08)',
        'card-hover': '0px 8px 28px rgba(15, 23, 42, 0.12)',
        inset: 'inset 0 2px 6px rgba(15, 23, 42, 0.08)',
        fab: '0px 6px 20px rgba(16, 185, 129, 0.35)',
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom, 0px)',
        'safe-t': 'env(safe-area-inset-top, 0px)',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)' },
          '70%': { boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'pulse-ring': 'pulseRing 2s infinite',
      },
    },
  },
  plugins: [],
};
