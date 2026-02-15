import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const artifactsRoot = path.resolve(__dirname, "./.artifacts");
const webBuildDir = path.join(artifactsRoot, "build");

// https://vite.dev/config/
export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: webBuildDir,
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({
      autoCodeSplitting: true,
      target: "react",
    }),
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
