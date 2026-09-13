import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Capacitor mobile app (generated/minified files)
    "mobile/**",
    // Node build scripts — CommonJS, run outside the bundler, so the
    // browser/Next rules here flag `require` and friends as undefined.
    "scripts/**",
  ]),
]);

export default eslintConfig;
