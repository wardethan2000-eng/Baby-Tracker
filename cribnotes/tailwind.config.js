module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b1120',
        surface: '#161f33',
        elevated: '#1e2d47',
        primary: '#38bdf8',
        secondary: '#818cf8',
      },
    },
  },
  plugins: [],
};