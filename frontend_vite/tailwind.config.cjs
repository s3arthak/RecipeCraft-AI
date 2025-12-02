// tailwind.config.cjs
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
      },
      colors: {
        primary: {
          50:  '#e6fffa',
          100: '#bff3ea',
          200: '#8de9da',
          300: '#5ce0ca',
          400: '#37d6bb',
          500: '#0fbfa6',
          600: '#0b9a87',
          700: '#0a806e',
          800: '#07624f',
          900: '#04433a'
        },
        accent: {
          50:  '#fff5f0',
          100: '#ffe1d9',
          200: '#ffcbbf',
          300: '#ffb49f',
          400: '#ff935f',
          500: '#ff6f2e',
          600: '#e05f27',
          700: '#b44b20',
          800: '#8a3719',
          900: '#5e2611'
        }
      },
      boxShadow: {
        // keep if you want custom names later — but we used built-ins now
        soft: '0 6px 20px rgba(16,24,40,0.08)',
        mid: '0 10px 30px rgba(16,24,40,0.12)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem'
      }
    }
  },
  plugins: []
};
