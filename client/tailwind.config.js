module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#611817', // Rich Maroon from logo
        'primary-hover': '#4e100f', // Darker Maroon for hover
        sidebar: '#0c102b', // Deep Dark Navy Sidebar (representing uniform blue)
        'sidebar-hover': '#161c46',
        'sidebar-active': '#1d2456',
        'bg-main': '#f8fafc', // Soft Gray Page Background
        'card-border': '#f1f5f9',
        
        // Custom color palette overrides to map general colors to school identity
        blue: {
          50: '#fcf2f2',
          100: '#f9e3e3',
          200: '#f3c2c2',
          300: '#e89696',
          400: '#d76161',
          500: '#7d1e1c',
          600: '#611817', // Logo Maroon primary
          700: '#4e100f',
          800: '#3c0a09',
          900: '#2a0504',
          950: '#1b0202',
        },
        indigo: {
          50: '#f0f5ff',
          100: '#e1ebff',
          200: '#bcd4ff',
          300: '#90b7ff',
          400: '#5c93ff',
          500: '#2563eb', // Uniform Blue primary
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
          950: '#0f172a',
        },

        // Attendance Status Colors
        present: '#22c55e',
        absent: '#ef4444',
        holiday: '#94a3b8',
        
        // Fees Status Colors
        paid: '#22c55e',
        pending: '#f59e0b',
        overdue: '#ef4444'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 10px 30px -5px rgba(0, 0, 0, 0.03), 0 5px 15px -5px rgba(0, 0, 0, 0.03)',
        'glow': '0 0 20px -3px rgba(97, 24, 23, 0.15)',
        'card': '0 4px 20px -2px rgba(50, 50, 93, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.08)'
      }
    }
  },
  plugins: []
};