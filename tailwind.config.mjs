/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#007bff',
        success: '#28a745',
        error: '#dc3545',
      },
    },
  },
  plugins: [],
}; 