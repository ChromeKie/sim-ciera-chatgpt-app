import { spawn, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const localUrl = "http://127.0.0.1:8787";
const chatgptPluginsUrl = "https://chatgpt.com/plugins";
const nodeDownloadUrl = "https://nodejs.org/en/download";
const ngrokSetupUrl = "https://dashboard.ngrok.com/get-started/setup";

let serverProcess = null;
let tunnelProcess = null;
let stopping = false;

process.chdir(projectRoot);

function heading(text) {
  console.log(`\n=== ${text} ===`);
}

function run(command, args, label) {
  heading(label);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: isWindows,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}.`);
  }
}

function commandWorks(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "ignore",
    shell: isWindows,
  });
  return !result.error && result.status === 0;
}

function openUrl(url) {
  let child;
  if (isWindows) {
    child = spawn("cmd", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
  } else if (process.platform === "darwin") {
    child = spawn("open", [url], { detached: true, stdio: "ignore" });
  } else {
    child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  }
  child.on("error", () => {});
  child.unref();
}

function copyToClipboard(text) {
  const command = isWindows ? "clip" : process.platform === "darwin" ? "pbcopy" : "xclip";
  const args = command === "xclip" ? ["-selection", "clipboard"] : [];
  const result = spawnSync(command, args, {
    input: text,
    encoding: "utf8",
    stdio: ["pipe", "ignore", "ignore"],
    shell: isWindows,
  });
  return !result.error && result.status === 0;
}

async function fetchJson(url, timeoutMs = 1200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function inspectLocalServer() {
  return fetchJson(`${localUrl}/`);
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null) {
      throw new Error("The Sim-Ciera server stopped before becoming ready.");
    }
    const status = await inspectLocalServer();
    if (status?.name === "sim-ciera" && status?.mcp === "/mcp") return status;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 350));
  }
  throw new Error("Sim-Ciera did not become ready on port 8787 within 20 seconds.");
}

async function waitForTunnel() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (tunnelProcess?.exitCode !== null) {
      throw new Error("ngrok stopped before creating the tunnel.");
    }
    const data = await fetchJson("http://127.0.0.1:4040/api/tunnels");
    const tunnels = Array.isArray(data?.tunnels) ? data.tunnels : [];
    const matching = tunnels.find(
      (item) =>
        typeof item?.public_url === "string" &&
        item.public_url.startsWith("https://") &&
        JSON.stringify(item.config ?? {}).includes("8787")
    );
    const fallback = tunnels.find(
      (item) => typeof item?.public_url === "string" && item.public_url.startsWith("https://")
    );
    const publicUrl = matching?.public_url ?? fallback?.public_url;
    if (publicUrl) return publicUrl.replace(/\/$/, "");
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  throw new Error("ngrok did not provide an HTTPS address within 45 seconds.");
}

function stopChild(child) {
  if (child && child.exitCode === null && !child.killed) child.kill("SIGTERM");
}

function cleanup() {
  if (stopping) return;
  stopping = true;
  stopChild(tunnelProcess);
  stopChild(serverProcess);
}

process.once("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.once("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
process.once("exit", cleanup);

async function main() {
  heading("Sim-Ciera v0.2 Easy Start");

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (!Number.isFinite(nodeMajor) || nodeMajor < 18) {
    openUrl(nodeDownloadUrl);
    throw new Error(`Node 18 or newer is required. You currently have ${process.version}.`);
  }
  console.log(`Node ${process.version} is ready.`);

  const dependencyMarkers = [
    join(projectRoot, "node_modules", "@modelcontextprotocol", "sdk"),
    join(projectRoot, "node_modules", "@modelcontextprotocol", "ext-apps"),
    join(projectRoot, "node_modules", "esbuild"),
  ];
  if (!dependencyMarkers.every(existsSync)) {
    run(npmCommand, ["install", "--no-audit", "--no-fund"], "Installing Sim-Ciera");
  } else {
    console.log("Dependencies are already installed.");
  }

  run(npmCommand, ["run", "build"], "Building the dashboard");
  run(npmCommand, ["run", "validate"], "Validating Sim-Ciera");

  const existingServer = await inspectLocalServer();
  if (existingServer) {
    if (existingServer.name !== "sim-ciera" || existingServer.mcp !== "/mcp") {
      throw new Error("Port 8787 is already being used by another program. Close it and try again.");
    }
    console.log("Sim-Ciera is already running locally; using the existing server.");
  } else {
    heading("Starting Sim-Ciera");
    serverProcess = spawn(process.execPath, ["server.js"], {
      cwd: projectRoot,
      stdio: "inherit",
    });
    serverProcess.on("error", (error) => console.error("Server error:", error.message));
    await waitForServer();
  }

  if (!commandWorks("ngrok", ["version"])) {
    openUrl(ngrokSetupUrl);
    throw new Error(
      "ngrok is not installed yet. The setup page has opened. Install it, connect your free account, then run this launcher again."
    );
  }

  heading("Creating the HTTPS address");
  tunnelProcess = spawn("ngrok", ["http", "8787", "--log=stdout", "--log-format=json"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: isWindows,
  });
  tunnelProcess.on("error", (error) => console.error("Tunnel error:", error.message));

  let publicUrl;
  try {
    publicUrl = await waitForTunnel();
  } catch (error) {
    openUrl(ngrokSetupUrl);
    throw new Error(
      `${error.message} If ngrok asks you to connect your account, follow the one-time command on the page that just opened, then run this launcher again.`
    );
  }

  const endpoint = `${publicUrl}/mcp`;
  writeFileSync(join(projectRoot, "SIM-CIERA-MCP-URL.txt"), `${endpoint}\n`, "utf8");
  const copied = copyToClipboard(endpoint);
  openUrl(chatgptPluginsUrl);

  console.log("\n============================================================");
  console.log("SIM-CIERA IS READY");
  console.log("============================================================");
  console.log(`MCP address: ${endpoint}`);
  console.log(copied ? "The address is copied to your clipboard." : "Copy the address shown above.");
  console.log("\nOn the ChatGPT page that opened:");
  console.log("1. Select + to create a developer app.");
  console.log("2. Name it: Sim-Ciera");
  console.log("3. Paste the MCP address.");
  console.log("4. Choose: No Authentication");
  console.log("5. Create it and review the seven discovered tools.");
  console.log("\nKEEP THIS WINDOW OPEN while using Sim-Ciera.");
  console.log("Press Ctrl+C or close this window when you are finished.");
  console.log("Keep the tunnel address private; it is temporary and changes after restart.\n");

  await new Promise((resolveRun, rejectRun) => {
    const fail = (name) => (code, signal) => {
      if (stopping) return resolveRun();
      rejectRun(new Error(`${name} stopped unexpectedly (${signal ?? code ?? "unknown reason"}).`));
    };
    serverProcess?.once("exit", fail("Sim-Ciera"));
    tunnelProcess.once("exit", fail("ngrok"));
  });
}

main().catch((error) => {
  cleanup();
  console.error(`\nEasy Start stopped: ${error.message}`);
  console.error("Open START-HERE.html for the short fix, then run the launcher again.");
  process.exitCode = 1;
});
