import { tool } from "ai";
import { z } from "zod";
import type { AppleSandboxSession } from "@/lib/sandbox/apple-container";
import { zeroCall } from "@/lib/zero/client";
import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

export type CodingContext = {
  organizationId: string;
  userId: string;
  roleId?: string | null;
  sandbox: AppleSandboxSession;
};

export function createCodingTools(ctx: CodingContext) {
  return {
    shell: tool({
      description: "Run a shell command inside the local Apple container sandbox.",
      inputSchema: z.object({
        command: z.string(),
      }),
      execute: async ({ command }, { abortSignal }) => {
        const result = await ctx.sandbox.run({ command, abortSignal });
        return {
          exitCode: result.exitCode,
          stdout: result.stdout.slice(0, 8000),
          stderr: result.stderr.slice(0, 4000),
        };
      },
    }),

    readFile: tool({
      description: "Read a file from the sandbox workspace.",
      inputSchema: z.object({
        path: z.string(),
      }),
      execute: async ({ path }) => {
        const full = join(ctx.sandbox.workspaceHostPath, path);
        try {
          const content = await readFile(full, "utf8");
          return { path, content: content.slice(0, 20000) };
        } catch (e) {
          return { error: String(e) };
        }
      },
    }),

    writeFile: tool({
      description: "Write a file in the sandbox workspace.",
      inputSchema: z.object({
        path: z.string(),
        content: z.string(),
      }),
      execute: async ({ path, content }) => {
        const full = join(ctx.sandbox.workspaceHostPath, path);
        await writeFile(full, content, "utf8");
        return { path, bytes: content.length };
      },
    }),

    zero: tool({
      description:
        "Call Zero via Roster's instrumented client. Action capabilities create approval tasks.",
      inputSchema: z.object({
        service: z.string(),
        capability: z.string(),
        purpose: z.string(),
        query: z.string().optional(),
      }),
      execute: async ({ service, capability, purpose, query }) => {
        return zeroCall({
          organizationId: ctx.organizationId,
          roleId: ctx.roleId,
          service,
          capability,
          purpose,
          query,
        });
      },
    }),
  };
}
