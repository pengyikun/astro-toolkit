import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2563eb', light: '#eff6ff', dark: '#1d4ed8', soft: '#eff6ff' },
        page: '#f7f8fb',
        ink: { DEFAULT: '#111827', secondary: '#4b5563', muted: '#6b7280' },
        border: '#e5e7eb',
        'input-border': '#d1d5db',
        danger: { DEFAULT: '#dc2626', light: '#fef2f2', dark: '#b91c1c', border: '#fecaca', soft: '#fef2f2' },
        success: { DEFAULT: '#047857', light: '#ecfdf5', border: '#a7f3d0', soft: '#ecfdf5' },
        warning: { DEFAULT: '#b45309', light: '#fff7ed', border: '#fdba74', soft: '#fff7ed' },
        purple: { DEFAULT: '#7c3aed', light: '#f5f3ff', soft: '#f5f3ff' },
      },
    },
  },
  plugins: [],
};

export default config;
