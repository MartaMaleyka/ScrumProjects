/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './src/components/**/*.{astro,html,js,jsx,ts,tsx}',
    './src/pages/**/*.{astro,html,js,jsx,ts,tsx}',
    './src/layouts/**/*.{astro,html,js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'blue-deep': '#0264C5',
        'blue-light': '#0EA5E9',
        'gray-neutral': '#6B7280',
        'gray-light': '#F3F4F6',
        'cream': '#FEF3C7',
        'yellow-sun': '#F59E0B',
        'yellow-soft': '#FCD34D',
      },
      fontFamily: {
        'chatgpt-normal': ['Inter', 'system-ui', 'sans-serif'],
        'chatgpt-medium': ['Inter', 'system-ui', 'sans-serif'],
        'chatgpt-semibold': ['Inter', 'system-ui', 'sans-serif'],
        'chatgpt-bold': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 4px rgba(0, 0, 0, 0.05)',
        'medium': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'large': '0 10px 15px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}

