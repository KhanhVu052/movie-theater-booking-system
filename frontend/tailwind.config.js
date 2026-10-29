/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kinpaku: {
          gold: "oklch(84% 0.19 80.46)",
          pale: "oklch(86% 0.07 84)",
          rich: "oklch(77% 0.13 82)",
          deep: "oklch(61% 0.085 78)",
        },
        patina: {
          verdigris: "oklch(70% 0.12 188)",
          pale: "oklch(82% 0.07 188)",
          deep: "oklch(49% 0.08 188)",
        },
        lacquer: {
          black: "oklch(7% 0.006 95)",
          deep: "oklch(4% 0.004 95)",
          raised: "oklch(11% 0.006 95)",
        },
        ink: {
          dark: "oklch(14% 0.018 95)",
        },
        graphite: {
          DEFAULT: "oklch(15% 0.008 95)",
          2: "oklch(19% 0.008 95)",
        },
        text: {
          champagne: "oklch(91% 0 0)",
          warm: "oklch(88% 0 0)",
          muted: "oklch(72% 0 0)",
          faint: "oklch(62% 0 0)",
          muteDeep: "oklch(52% 0 0)",
        },
        hairline: {
          DEFAULT: "oklch(78% 0 0 / 0.16)",
          strong: "oklch(74% 0.09 82 / 0.6)",
        },
      },
      fontFamily: {
        display: ['"Alumni Sans"', '"Albert Sans"', 'Arial', 'sans-serif'],
        body: ['"Albert Sans"', '"Avenir Next"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"SFMono-Regular"', '"Roboto Mono"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xs: "2px",
        code: "3px",
        sm: "4px",
        "control-sm": "5px",
        md: "6px",
        "control-md": "7px",
      },
    },
  },
  plugins: [],
}