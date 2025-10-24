/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: false,
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // darker blue
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        accent: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        neutral: {
          50:  '#f9f9f9',
          100: '#f1f1f1',
          200: '#e4e4e4',
          300: '#d0d0d0',
          400: '#a3a3a3',
          500: '#757575',
          600: '#525252',
          700: '#3b3b3b',
          800: '#262626',
          900: '#171717',
        },
        background: '#fffaf7',
        surface: '#ffffff',
        // Legacy semantic colors for component compatibility
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        error: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      boxShadow: ({ theme }) => ({
        xs: `0px 1px 2px ${theme("colors.neutral.900/6%")}`,
        sm: `0px 2px 4px ${theme("colors.neutral.900/6%")}`,
        md: `0px 3px 6px ${theme("colors.neutral.900/7%")}`,
        lg: `0px 4px 8px -2px ${theme("colors.neutral.900/5%")}, 0px 5px 10px ${theme("colors.neutral.900/8%")}`,
        xl: `0px 20px 24px -4px ${theme("colors.neutral.900/10%")}, 0px 8px 8px -4px ${theme("colors.neutral.900/4%")}`,
        subtle: '0 1px 2px rgba(0, 0, 0, 0.05)',
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }),
      spacing: {
        4.5: "1.125rem",
        5.5: "1.375rem",
        6.5: "1.625rem",
      },
      transitionDuration: {
        DEFAULT: "100ms",
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'transform-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
        'transform-rotate-fast': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
        'transform-rotate-alt': {
          '0%': { transform: 'rotate(30deg)' },
          '100%': { transform: 'rotate(-330deg)' },
        },
        'transform-rotate-alt-fast': {
          '0%': { transform: 'rotate(30deg)' },
          '100%': { transform: 'rotate(-330deg)' },
        },
        'transform-sparkle': {
          '0%': { transform: 'rotate(60deg)', opacity: '0.95' },
          '25%': { opacity: '0.85' },
          '50%': { transform: 'rotate(-300deg)', opacity: '0.9' },
          '75%': { opacity: '1' },
          '100%': { transform: 'rotate(-660deg)', opacity: '0.95' },
        },
        'transform-sparkle-fast': {
          '0%': { transform: 'rotate(60deg)', opacity: '0.95' },
          '25%': { opacity: '0.85' },
          '50%': { transform: 'rotate(-300deg)', opacity: '0.9' },
          '75%': { opacity: '1' },
          '100%': { transform: 'rotate(-660deg)', opacity: '0.95' },
        },
        'shine-sweep': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-50% 0' },
        },
        'shine-sweep-alt': {
          '0%': { backgroundPosition: '-50% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'shine-sweep-fast': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-100% 0' },
        },
        'pulse-glow': {
          '0%': { opacity: '0.7', filter: 'blur(3px)', boxShadow: '0 0 12px 2px rgba(255, 215, 0, 0.7)' },
          '30%': { opacity: '0.9', filter: 'blur(4px)', boxShadow: '0 0 15px 3px rgba(255, 215, 0, 0.9)' },
          '70%': { opacity: '1', filter: 'blur(5px)', boxShadow: '0 0 18px 4px rgba(255, 215, 0, 1)' },
          '100%': { opacity: '0.7', filter: 'blur(3px)', boxShadow: '0 0 12px 2px rgba(255, 215, 0, 0.7)' },
        },
        'pulse-glow-enhanced': {
          '0%': { opacity: '0.7', filter: 'blur(2px)', boxShadow: '0 0 10px 2px rgba(184, 134, 11, 0.6)' },
          '25%': { opacity: '0.8', filter: 'blur(3px)', boxShadow: '0 0 12px 3px rgba(184, 134, 11, 0.7)' },
          '50%': { opacity: '1', filter: 'blur(4px)', boxShadow: '0 0 15px 4px rgba(184, 134, 11, 0.9)' },
          '75%': { opacity: '0.8', filter: 'blur(3px)', boxShadow: '0 0 12px 3px rgba(184, 134, 11, 0.7)' },
          '100%': { opacity: '0.7', filter: 'blur(2px)', boxShadow: '0 0 10px 2px rgba(184, 134, 11, 0.6)' },
        },
        'pulse-size': {
          '0%': { transform: 'scale(1.00)' },
          '50%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1.00)' },
        },
        'pulse-size-delayed': {
          '0%': { transform: 'scale(1.02)' },
          '50%': { transform: 'scale(0.99)' },
          '100%': { transform: 'scale(1.02)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'transform-rotate': 'transform-rotate 3s linear infinite',
        'transform-rotate-fast': 'transform-rotate-fast 2s linear infinite',
        'transform-rotate-alt': 'transform-rotate-alt 3.5s linear infinite',
        'transform-rotate-alt-fast': 'transform-rotate-alt-fast 2.5s linear infinite',
        'transform-sparkle': 'transform-sparkle 4s ease-in-out infinite',
        'transform-sparkle-fast': 'transform-sparkle-fast 3s ease-in-out infinite',
        'shine-sweep': 'shine-sweep 2s ease-in-out infinite',
        'shine-sweep-alt': 'shine-sweep-alt 2.5s ease-in-out infinite',
        'shine-sweep-fast': 'shine-sweep-fast 1.2s linear infinite',
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
        'pulse-glow-enhanced': 'pulse-glow-enhanced 1.2s ease-in-out infinite',
        'pulse-size': 'pulse-size 2s ease-in-out infinite',
        'pulse-size-delayed': 'pulse-size-delayed 2.5s ease-in-out infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('tailwindcss-animate'),
  ],
};