import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

/**
 * Local Experimental_SandboxSession backed by Apple's `container` CLI.
 * Vercel Sandbox is managed-only; this keeps agent compute on localhost.
 */
export type SandboxRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type AppleSandboxSession = {
  name: string;
  workspaceHostPath: string;
  run: (opts: {
    command: string;
    workingDirectory?: string;
    env?: Record<string, string>;
    abortSignal?: AbortSignal;
  }) => Promise<SandboxRunResult>;
  stop: () => Promise<void>;
};

function runHost(
  cmd: string,
  args: string[],
  abortSignal?: AbortSignal,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    const onAbort = () => {
      child.kill("SIGTERM");
    };
    abortSignal?.addEventListener("abort", onAbort);
    child.on("error", (err) => {
      abortSignal?.removeEventListener("abort", onAbort);
      reject(err);
    });
    child.on("close", (code) => {
      abortSignal?.removeEventListener("abort", onAbort);
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

async function containerAvailable() {
  try {
    const r = await runHost("container", ["--version"]);
    return r.code === 0;
  } catch {
    return false;
  }
}

/**
 * Fallback local sandbox when Apple container isn't available:
 * runs commands in an isolated workspace directory (dev convenience only).
 */
function createProcessSandbox(name: string, workspaceHostPath: string): AppleSandboxSession {
  return {
    name,
    workspaceHostPath,
    async run({ command, workingDirectory, env, abortSignal }) {
      const cwd = workingDirectory
        ? join(workspaceHostPath, workingDirectory)
        : workspaceHostPath;
      const result = await new Promise<SandboxRunResult>((resolve, reject) => {
        const child = spawn("bash", ["-lc", command], {
          cwd,
          env: { ...process.env, ...env, ROSTER_SANDBOX: name },
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (d) => {
          stdout += d.toString();
        });
        child.stderr.on("data", (d) => {
          stderr += d.toString();
        });
        const onAbort = () => child.kill("SIGTERM");
        abortSignal?.addEventListener("abort", onAbort);
        child.on("error", reject);
        child.on("close", (code) => {
          abortSignal?.removeEventListener("abort", onAbort);
          resolve({ stdout, stderr, exitCode: code ?? 1 });
        });
      });
      return result;
    },
    async stop() {
      /* no-op for process sandbox */
    },
  };
}

export async function createAppleSandboxSession(opts: {
  sessionKey: string;
}): Promise<AppleSandboxSession> {
  const name = `roster-sbx-${opts.sessionKey}`.slice(0, 50).replace(/[^a-zA-Z0-9-_]/g, "-");
  const workspaceHostPath = join(tmpdir(), "roster-sandboxes", name);
  await mkdir(workspaceHostPath, { recursive: true });

  // Stub zero CLI that reminds agents this is demo mode
  const zeroStub = `#!/bin/sh
echo "[roster-demo] zero $@ — routed through Roster instrumented client (no live outreach)"
exit 0
`;
  await writeFile(join(workspaceHostPath, "zero"), zeroStub, { mode: 0o755 });

  const available = await containerAvailable();
  if (!available) {
    return createProcessSandbox(name, workspaceHostPath);
  }

  // Ensure system is up
  await runHost("container", ["system", "start"]).catch(() => undefined);

  // Remove stale container with same name
  await runHost("container", ["rm", name]).catch(() => undefined);

  const start = await runHost("container", [
    "run",
    "--name",
    name,
    "--detach",
    "--volume",
    `${workspaceHostPath}:/workspace`,
    "--workdir",
    "/workspace",
    "node:22-alpine",
    "sleep",
    "infinity",
  ]);

  if (start.code !== 0) {
    // Fall back if container run fails
    return createProcessSandbox(name, workspaceHostPath);
  }

  // Install zero stub into PATH inside container
  await runHost("container", [
    "exec",
    name,
    "sh",
    "-lc",
    "cp /workspace/zero /usr/local/bin/zero && chmod +x /usr/local/bin/zero",
  ]);

  return {
    name,
    workspaceHostPath,
    async run({ command, workingDirectory, env, abortSignal }) {
      const wd = workingDirectory ? `/workspace/${workingDirectory}` : "/workspace";
      const envArgs = Object.entries(env || {}).flatMap(([k, v]) => [
        "--env",
        `${k}=${v}`,
      ]);
      const result = await runHost(
        "container",
        ["exec", ...envArgs, "-w", wd, name, "sh", "-lc", command],
        abortSignal,
      );
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code,
      };
    },
    async stop() {
      await runHost("container", ["stop", name]).catch(() => undefined);
      await runHost("container", ["rm", name]).catch(() => undefined);
    },
  };
}
