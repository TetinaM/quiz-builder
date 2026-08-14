import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "prisma/migrations/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Allow an intentionally-unused arg/var when prefixed with `_` (used
      // throughout, e.g. Express's `(_req, res) => ...` handlers).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Must be last: disables stylistic ESLint rules that would fight Prettier.
  eslintConfigPrettier,
);
