import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir("public", { recursive: true });

await build({
  entryPoints: ["web/src/main.jsx"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  outfile: "public/widget.js",
  jsx: "automatic",
  minify: true,
  sourcemap: false,
  legalComments: "none",
});

console.log("Built public/widget.js");
