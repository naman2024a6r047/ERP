module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', // Premium Royal Blue
        'primary-hover': '#1d4ed8',
        sidebar: '#0c102b', // Deep Dark Navy Sidebar
        'sidebar-hover': '#161c46',
        'sidebar-active': '#1d2456',
        'bg-main': '#f8fafc', // Soft Gray Page Background
        'card-border': '#f1f5f9',
        
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
        'glow': '0 0 20px -3px rgba(37, 99, 235, 0.15)',
        'card': '0 4px 20px -2px rgba(50, 50, 93, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.08)'
      }
    }
  },
  plugins: []
};