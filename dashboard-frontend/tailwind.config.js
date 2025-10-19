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
          50:  '#fff7f3',
          100: '#ffe9e0',
          200: '#ffc7b3',
          300: '#ffa380',
          400: '#ff7a4d',
          500: '#e85c24', // core orange
          600: '#cc471b',
          700: '#a93916',
          800: '#862e12',
          900: '#6b240e',
        },
        accent: {
          50: '#fffdfa',
          100: '#fff4e6',
          200: '#ffe0b3',
          300: '#ffc47a',
          400: '#ff9c33',
          500: '#f57c00',
          600: '#d36400',
          700: '#a94e00',
          800: '#7a3800',
          900: '#4d2200',
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
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
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
      boxShadow: {
        subtle: '0 1px 2px rgba(0, 0, 0, 0.05)',
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
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
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
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