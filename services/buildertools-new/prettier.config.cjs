/** @type {import("prettier").Config} */
const config = {
  overrides: [
    {
      files: "*.xml",
      options: {
        xmlWhitespaceSensitivity: "ignore",
      },
    },
    {
      files: "**/*.{ts,tsx}",
      options: {
        parser: "typescript",
      },
    },
  ],
  plugins: ["@prettier/plugin-xml", "prettier-plugin-tailwindcss"],
  singleAttributePerLine: true,
};

module.exports = config;
