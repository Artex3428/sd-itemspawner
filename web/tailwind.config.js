export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0b0c0e',
        panel: '#131518',
        raise: '#1a1d21',
        high: '#22262b',
        line: '#26292e',
        edge: '#33383f',
        ink: '#e6e8ea',
        muted: '#8b9096',
        faint: '#5c6169',
        select: '#d4d8dd',
        warn: '#c8974a',
        bad: '#b3564b',
        good: '#6f9457',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        panel: '0 24px 64px -12px rgba(0, 0, 0, 0.75)',
        lift: '0 2px 12px -2px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
};
