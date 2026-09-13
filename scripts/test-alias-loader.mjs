// Resolves the project's "@/*" -> "src/*" TypeScript path alias for
// `node --test`, which has no bundler and does not read tsconfig "paths".
// Registered via `node --import ./scripts/test-alias-loader.mjs --test ...`.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const srcUrl = new URL("../src/", import.meta.url).href;

register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/")) {
        const rest = specifier.slice(2);
        const withExt = rest.endsWith(".ts") ? rest : rest + ".ts";
        return nextResolve("${srcUrl}" + withExt, context);
      }
      return nextResolve(specifier, context);
    }
  `)}`,
  import.meta.url,
);
