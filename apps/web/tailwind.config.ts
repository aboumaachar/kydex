import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        riskLow: '#0F766E',
        riskMedium: '#B45309',
        riskHigh: '#B91C1C',
        riskCritical: '#7F1D1D',
      },
    },
  },
  plugins: [],
};

export default config;
