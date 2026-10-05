import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: [
      ".next/**", ".open-next/**", ".astro/**", "dist/**", ".wrangler/**",
      ".claude/**", ".superpowers/**", "output/**", "cloudflare-env.d.ts",
      // Preserved Next.js routes and generated references are archival source.
      "app/**/*.ts", "app/**/*.tsx", "next-env.d.ts", "next.config.ts", "open-next.config.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs["flat/recommended"],
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
