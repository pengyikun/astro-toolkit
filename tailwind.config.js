/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/views/**/*.ejs',
    './public/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#635BFF', light: '#f6f4ff', dark: '#4b45c6' },
        page: '#f7f8f9',
        ink: { DEFAULT: '#1a1f36', secondary: '#697386', muted: '#a3acb9' },
        border: '#e3e8ee',
        'input-border': '#d8dee4',
        danger: { DEFAULT: '#cd3d64', light: '#fce4ec', dark: '#b8365a', border: '#f5b8c4' },
        success: { DEFAULT: '#0d7d4d', light: '#e6f9f0', border: '#b5e8cc' },
        warning: { DEFAULT: '#c77d0a', light: '#fff8e6', border: '#f5dfa0' },
        purple: { DEFAULT: '#7c3aed', light: '#f3e8ff' },
      },
    },
  },
  plugins: [],
};
