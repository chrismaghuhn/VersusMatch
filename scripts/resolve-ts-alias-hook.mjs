import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");

function resolveAlias(specifier) {
  const base = path.join(root, specifier.slice(2));
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
    const withExt = `${base}${ext}`;
    if (fs.existsSync(withExt)) return withExt;
  }
  return base;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      url: "data:text/javascript,export {}",
      shortCircuit: true,
      format: "module",
    };
  }
  if (specifier.startsWith("@/")) {
    const mapped = resolveAlias(specifier);
    return nextResolve(pathToFileURL(mapped).href, context);
  }
  return nextResolve(specifier, context);
}
