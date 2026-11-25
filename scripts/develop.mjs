import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const windows = process.platform === "win32";
const localPython = path.join(
  root,
  ".venv",
  windows ? "Scripts/python.exe" : "bin/python",
);
const python = existsSync(localPython) ? localPython : "python";
const children = [];
let closing = false;

function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}

function start(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: "inherit" });
  children.push(child);
  child.once("error", (error) => {
    console.error(error.message);
    close(1);
  });
  child.once("exit", (code) => close(code ?? 0));
}

start(
  python,
  ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
  path.join(root, "backend"),
);
start(
  process.execPath,
  [path.join(root, "node_modules/vite/bin/vite.js"), ...process.argv.slice(2)],
  path.join(root, "frontend"),
);
process.on("SIGINT", () => close());
process.on("SIGTERM", () => close());
