import eslintComments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import eslintReact from "@eslint-react/eslint-plugin";
import eslint from "@eslint/js";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import tanstackRouter from "@tanstack/eslint-plugin-router";
import prettier from "eslint-config-prettier/flat";
import { importX } from "eslint-plugin-import-x";
import jest from "eslint-plugin-jest";
import jestDom from "eslint-plugin-jest-dom";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { configs as perfectionist } from "eslint-plugin-perfectionist";
import playwright from "eslint-plugin-playwright";
import { configs as reactCompiler } from "eslint-plugin-react-compiler";
import reactHooks from "eslint-plugin-react-hooks";
import { reactRefresh } from "eslint-plugin-react-refresh";
import reactEffects from "eslint-plugin-react-you-might-not-need-an-effect";
import { configs as regExp } from "eslint-plugin-regexp";
import testingLibrary from "eslint-plugin-testing-library";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import { type Config, configs as tseslint } from "typescript-eslint";

const e2eGlobs = ["**/{__tests__,tests}/e2e/**", "**/*.e2e?(.test).{ts,tsx}"];

const config: Config = defineConfig([
  {
    ignores: [
      "**/node_modules/**",
      "output/**",
      ".artifacts/**",
      "src/routeTree.gen.ts",
    ],
  },

  {
    extends: [eslint.configs.recommended],
    rules: {
      "arrow-body-style": "warn",
      curly: ["warn", "all"],
      "prefer-arrow-callback": ["warn"],
    },
  },

  {
    plugins: {
      // @ts-expect-error - https://github.com/un-ts/eslint-plugin-import-x/issues/203
      "import-x": importX,
    },
    rules: {
      "import-x/no-default-export": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-named-as-default": "error",
      "import-x/no-named-as-default-member": "error",
    },
  },

  {
    files: ["**/*.config.ts"],
    rules: {
      "import-x/no-default-export": "off",
    },
  },

  {
    extends: [perfectionist["recommended-natural"]],
    rules: {
      "perfectionist/sort-modules": [
        "error",
        {
          type: "usage",
        },
      ],
    },
  },

  {
    extends: [unicorn.configs.recommended],
    rules: {
      "unicorn/filename-case": "off",
      "unicorn/no-array-callback-reference": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/no-null": "off",
      // Certain libraries like TanStack query/router use undefined intentionally
      "unicorn/no-useless-undefined": ["error", { checkArguments: false }],
      "unicorn/prevent-abbreviations": "off",
    },
  },

  {
    extends: [tseslint.strictTypeChecked, tseslint.stylisticTypeChecked],
    files: ["**/*.{ts,tsx,cts,mts}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/array-type": [
        "warn",
        {
          default: "array-simple",
        },
      ],

      // Allow `declare global { ... }` for environment variables
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],

      // Allow `while (true)` — idiomatic in loops
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        {
          allowConstantLoopConditions: "only-allowed-literals",
        },
      ],

      "@typescript-eslint/no-unsafe-type-assertion": "error",

      // _prefix suppresses warnings for intentionally unused vars like catch
      // bindings and destructured rest siblings
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
        },
      ],

      // Conflicts with no-non-null-assertion rule
      "@typescript-eslint/non-nullable-type-assertion-style": "off",

      // Allow `throw redirect(...)` used by TanStack Router
      "@typescript-eslint/only-throw-error": [
        "error",
        {
          allow: ["Redirect"],
        },
      ],

      "@typescript-eslint/require-array-sort-compare": "error",

      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
        },
      ],
    },
  },

  {
    extends: [
      eslintReact.configs["recommended-type-checked"],
      reactHooks.configs.flat["recommended-latest"],
      reactCompiler.recommended,
      jsxA11y.flatConfigs.recommended,
      reactEffects.configs.recommended,
      reactRefresh.configs.vite(),
      tanstackQuery.configs["flat/recommended"],
      tanstackRouter.configs["flat/recommended"],
    ],
    files: ["**/*.{jsx,tsx,ts,js}"],
    rules: {
      "react-refresh/only-export-components": [
        "error",
        {
          allowConstantExport: true,
        },
      ],
    },
  },

  {
    files: ["src/routes/**/*.tsx"],
    rules: {
      // TanStack Router's Vite plugin handles HMR for route files via its own
      // import.meta.hot.accept() handler — React Fast Refresh is not involved
      "react-refresh/only-export-components": "off",
    },
  },

  {
    extends: [
      jest.configs["flat/recommended"],
      testingLibrary.configs["flat/react"],
      jestDom.configs["flat/recommended"],
    ],
    files: [
      "**/{__tests__,tests}/**/*.{js,jsx,ts,tsx}",
      "**/*.{test,spec}.{js,jsx,ts,tsx}",
    ],
    ignores: e2eGlobs,
    rules: {
      // Not using Jest — this rule tries to detect the Jest package version
      "jest/no-deprecated-functions": "off",
    },
    settings: {
      // Recognize describe/it/expect from bun:test instead of the global jest object
      jest: { globalPackage: "bun:test" },
    },
  },

  {
    extends: [playwright.configs["flat/recommended"]],
    files: e2eGlobs,
  },

  regExp.recommended,

  eslintComments.recommended,

  prettier,
]);

export default config;
