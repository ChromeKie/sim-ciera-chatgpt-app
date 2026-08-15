import { readFileSync } from "node:fs";

const required = [
  "package.json",
  "alpic.json",
  "SPEC.md",
  "supabase-schema.sql",
  "server.js",
  "public/widget-shell.html",
  "web/src/main.jsx",
  "knowledge/CIERA_SIMULATOR.md",
  "data/store.json",
  "scripts/easy-start.mjs",
  "START-SIM-CIERA-WINDOWS.bat",
  "START-SIM-CIERA-MAC.command",
  "START-HERE.html",
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

if (pkg.version !== "0.2.0") throw new Error("Package version must be 0.2.0");
if (!pkg.scripts?.easy) throw new Error("Missing easy-start npm script");

for (const token of ["/mcp", "get_simulator_context", "save_prediction", "audit_prediction", "promote_calibration", "render_dashboard"]) {
  if (!server.includes(token)) throw new Error(`server.js missing ${token}`);
}

for (const token of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SIM_CIERA_STORE_ID"]) {
  if (!server.includes(token)) throw new Error(`server.js missing durable-store setting ${token}`);
}

for (const token of ["sendFollowUpMessage", "setWidgetState", "Model Ledger", "Evidence", "Unknowns"]) {
  if (!widget.includes(token)) throw new Error(`widget source missing ${token}`);
}

if (!server.includes('APP_VERSION = "0.2.0"')) throw new Error("Server version is not 0.2.0");
if (!widget.includes('version: "0.2.0"')) throw new Error("Widget version is not 0.2.0");

if (!Array.isArray(store.baselineRules)) {
  throw new Error("Seed store needs a baselineRules array");
}

console.log("Static validation passed.");
