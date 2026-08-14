import { readFileSync } from "node:fs";

const required = [
  "package.json",
  "server.js",
  "public/widget-shell.html",
  "web/src/main.jsx",
  "knowledge/CIERA_SIMULATOR.md",
  "data/store.json",
];

for (const file of required) {
  readFileSync(file);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const store = JSON.parse(readFileSync("data/store.json", "utf8"));
const server = readFileSync("server.js", "utf8");
const widget = readFileSync("web/src/main.jsx", "utf8");

for (const dep of ["@modelcontextprotocol/sdk", "@modelcontextprotocol/ext-apps", "zod", "react", "react-dom"]) {
  if (!pkg.dependencies?.[dep]) throw new Error(`Missing dependency: ${dep}`);
}

for (const token of ["/mcp", "get_simulator_context", "save_prediction", "audit_prediction", "promote_calibration", "render_dashboard"]) {
  if (!server.includes(token)) throw new Error(`server.js missing ${token}`);
}

for (const token of ["sendFollowUpMessage", "setWidgetState", "Model Ledger", "Evidence", "Unknowns"]) {
  if (!widget.includes(token)) throw new Error(`widget source missing ${token}`);
}

if (!Array.isArray(store.baselineRules) || store.baselineRules.length < 1) {
  throw new Error("Seed store needs baseline rules");
}

console.log("Static validation passed.");
