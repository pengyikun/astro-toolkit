import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],     // 11px — micro labels, kickers
        'caption': ['0.8125rem', { lineHeight: '1.25rem' }], // 13px — body-compact, helper text
      },
      colors: {
        /* Existing app tokens — keep until Phase 5 cleanup */
        brand: { DEFAULT: '#2563eb', light: '#eff6ff', dark: '#1d4ed8', soft: '#eff6ff' },
        page: '#f7f8fb',
        ink: { DEFAULT: '#111827', secondary: '#4b5563', muted: '#6b7280' },
        'input-border': '#d1d5db',
        danger: { DEFAULT: '#dc2626', light: '#fef2f2', dark: '#b91c1c', border: '#fecaca', soft: '#fef2f2' },
        success: { DEFAULT: '#047857', light: '#ecfdf5', border: '#a7f3d0', soft: '#ecfdf5' },
        warning: { DEFAULT: '#b45309', light: '#fff7ed', border: '#fdba74', soft: '#fff7ed' },
        purple: { DEFAULT: '#7c3aed', light: '#f5f3ff', soft: '#f5f3ff' },

        /* shadcn/ui semantic tokens */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
