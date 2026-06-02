import path from "node:path";
import { pathToFileURL } from "node:url";
import { register } from "node:module";

register(
  pathToFileURL(path.join(import.meta.dirname, "resolve-ts-alias-hook.mjs")).href,
  import.meta.url
);
