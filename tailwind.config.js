export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        asphalt: '#101418',
        steel: '#27313a',
        signal: '#f5b301',
        shop: '#e8eef2',
        torch: '#cf3f24',
      },
      boxShadow: {
        panel: '0 20px 50px rgba(16, 20, 24, 0.14)',
      },
    },
  },
  plugins: [],
};
