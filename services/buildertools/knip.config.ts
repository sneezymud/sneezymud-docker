import type { KnipConfig } from "knip";

export default {
  entry: [
    // TanStack Router file-based routes (supplement auto-detected server/vite/etc.)
    "src/routes/**/*.{ts,tsx}",
    // Test files and their preloads/helpers
    "src/**/*.test.{ts,tsx}",
    "src/test-preload*.ts",
    "src/test-helpers-component.tsx",
  ],
  ignoreBinaries: [
    // Bash builtins used in the dev script
    "trap",
    "wait",
  ],
  ignoreDependencies: [
    // Imported via CSS, invisible to static import analysis
    "@fontsource-variable/crimson-pro",
    "@fontsource-variable/inter",
    "tailwindcss",
    "tw-animate-css",
    // CLI tool — never imported, run as a command
    "shadcn",
  ],
  project: ["src/**/*.{ts,tsx}", "eslint-rules/**/*.ts"],
} as const satisfies KnipConfig;
