/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      colors: {
        // Cool cloud/ink neutrals. The legacy `sand` name is retained so the
        // palette change reaches every existing surface without a risky class migration.
        sand: {
          25: '#FBFCFE',
          50: '#F5F7FA',
          100: '#EAF0F6',
          200: '#D8E1EC',
          300: '#BBC8D8',
          400: '#91A3B8',
          500: '#687B92',
          600: '#4D6076',
          700: '#37495E',
          800: '#233348',
          900: '#142236',
          950: '#091321',
        },
        // Accent: Coral/terracotta — warm CTA color
        coral: {
          50: '#FFF5F2',
          100: '#FFE8E0',
          200: '#FFD0C2',
          300: '#FFB09A',
          400: '#FF8566',
          500: '#F06543',
          600: '#D44A2E',
          700: '#B03420',
          800: '#8C2A1A',
          900: '#6B2318',
        },
        // Ocean: Warmed slightly
        ocean: {
          50: '#F0FAFB',
          100: '#D0F0F5',
          200: '#A6E1EC',
          300: '#6CC8DA',
          400: '#38A8C0',
          500: '#1E8FA6',
          600: '#1A7389',
          700: '#175C6D',
          800: '#174A58',
          900: '#163D49',
        },
        // Forest: earthy greens for nature/outdoor feel
        forest: {
          50: '#F3F8F4',
          100: '#E0EDE2',
          200: '#C2DBC7',
          300: '#96C0A0',
          400: '#6BA078',
          500: '#4A8558',
          600: '#386B44',
          700: '#2D5537',
          800: '#26442E',
          900: '#1F3826',
        },
        // Semantic tide colors
        tide: {
          high: '#10b981', // Emerald
          low: '#06b6d4', // Cyan
        },
      },
      maxWidth: {
        '8xl': '88rem',
      },
      boxShadow: {
        // Elevated shadows with color
        'ocean-sm': '0 2px 8px -2px rgba(0, 188, 212, 0.2)',
        'ocean-md': '0 4px 14px -3px rgba(0, 188, 212, 0.25)',
        'ocean-lg': '0 8px 24px -4px rgba(0, 188, 212, 0.3)',
        'shore-sm': '0 2px 8px -2px rgba(0, 150, 136, 0.2)',
        'shore-md': '0 4px 14px -3px rgba(0, 150, 136, 0.25)',
        // Card shadow system
        card: '0 4px 24px -8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        'card-hover': '0 8px 32px -8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        'card-dark': '0 4px 24px -8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        organic: '1.25rem',
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        wave: 'wave 1.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.5)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      backgroundImage: {
        'shimmer-gradient':
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        'shimmer-gradient-dark':
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
