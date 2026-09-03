import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src-tauri/target", "chrome-extension"] },
  js.configs.recommended,
  {
    files: ["chrome-extension/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        Blob: "readonly",
        chrome: "readonly",
        console: "readonly",
        document: "readonly",
        Event: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        InputEvent: "readonly",
        KeyboardEvent: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        window: "readonly",
        Worker: "readonly",
      },
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
);
