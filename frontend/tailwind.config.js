/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          DEFAULT: 'rgb(var(--brand-primary) / <alpha-value>)',
          dark: 'rgb(var(--brand-primary-dark) / <alpha-value>)',
          soft: 'rgb(var(--brand-primary-soft) / <alpha-value>)',
        },

        // Semantic
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',

        // Surfaces
        surface: {
          DEFAULT: 'rgb(var(--surface-card) / <alpha-value>)',
          bg: 'rgb(var(--surface-bg) / <alpha-value>)',
          border: 'rgb(var(--surface-border) / <alpha-value>)',
          hover: 'rgb(var(--surface-hover) / <alpha-value>)',
        },

        // Sidebar
        sidebar: {
          DEFAULT: 'rgb(var(--sidebar-bg) / <alpha-value>)',
          hover: 'rgb(var(--sidebar-bg-hover) / <alpha-value>)',
          text: 'rgb(var(--sidebar-text) / <alpha-value>)',
          'text-active': 'rgb(var(--sidebar-text-active) / <alpha-value>)',
          border: 'rgb(var(--sidebar-border) / <alpha-value>)',
        },

        // Text
        content: {
          DEFAULT: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
        },
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },

      transitionDuration: {
        fast: 'var(--duration-fast)',
        DEFAULT: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
      },
    },
  },
  plugins: [],
}