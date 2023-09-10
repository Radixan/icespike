/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["*.{html,js}"],
  theme: {
    extend: {
      screens: {
        "can-hover": {
          raw: "(hover: hover)"
        },
        "landscape": {
          raw: "(orientation: landscape)"
        },
        "short": {
          raw: "(max-height: 40rem)"
        }
      }
    },
  },
  plugins: [],
}

