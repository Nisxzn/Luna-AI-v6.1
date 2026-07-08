/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        panel: '#252526',
        border: '#3c3c3c',
        accent: '#007acc',
        'accent-hover': '#1f8ad2',
      },
    },
  },
  plugins: [],
}
