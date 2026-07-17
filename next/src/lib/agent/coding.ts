import { tool } from "ai";
import { z } from "zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppleSandboxSession } from "@/lib/sandbox/apple-container";
import { zeroCall } from "@/lib/zero/client";
import { db } from "@/lib/db";
import {
  candidates,
  people,
  rolePerspectives,
  roleRequirements,
  roles,
} from "@/lib/db/schema";

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

    listRoles: tool({
      description: "List recruiting roles for this organization.",
      inputSchema: z.object({}),
      execute: async () => {
        const list = await db
          .select({
            id: roles.id,
            title: roles.title,
            status: roles.status,
            seniority: roles.seniority,
            location: roles.location,
          })
          .from(roles)
          .where(eq(roles.organizationId, ctx.organizationId))
          .orderBy(desc(roles.updatedAt));
        return { roles: list };
      },
    }),

    getRole: tool({
      description: "Get a role with structured requirements and perspectives.",
      inputSchema: z.object({ roleId: z.string() }),
      execute: async ({ roleId }) => {
        const [role] = await db
          .select()
          .from(roles)
          .where(
            and(
              eq(roles.id, roleId),
              eq(roles.organizationId, ctx.organizationId),
            ),
          )
          .limit(1);
        if (!role) return { error: "Role not found" };
        const requirements = await db
          .select()
          .from(roleRequirements)
          .where(eq(roleRequirements.roleId, roleId));
        const perspectives = await db
          .select()
          .from(rolePerspectives)
          .where(eq(rolePerspectives.roleId, roleId));
        return { role, requirements, perspectives };
      },
    }),

    upsertPerson: tool({
      description:
        "Create or update a person in the org people database (e.g. from LinkedIn).",
      inputSchema: z.object({
        id: z.string().optional(),
        name: z.string(),
        email: z.string().optional(),
        headline: z.string().optional(),
        location: z.string().optional(),
        linkedinUrl: z.string().optional(),
        notes: z.string().optional(),
        links: z.record(z.string(), z.string()).optional(),
      }),
      execute: async (input) => {
        const links = {
          ...(input.links || {}),
          ...(input.linkedinUrl ? { linkedin: input.linkedinUrl } : {}),
        };

        if (input.id) {
          const [existing] = await db
            .select()
            .from(people)
            .where(
              and(
                eq(people.id, input.id),
                eq(people.organizationId, ctx.organizationId),
              ),
            )
            .limit(1);
          if (!existing) return { error: "Person not found" };
          await db
            .update(people)
            .set({
              name: input.name,
              email: input.email ?? existing.email,
              headline: input.headline ?? existing.headline,
              location: input.location ?? existing.location,
              notes: input.notes ?? existing.notes,
              links: { ...(existing.links || {}), ...links },
              lastSeenAt: new Date(),
            })
            .where(eq(people.id, input.id));
          return { id: input.id, updated: true };
        }

        // Match by email or linkedin if present
        if (input.email) {
          const [byEmail] = await db
            .select()
            .from(people)
            .where(
              and(
                eq(people.organizationId, ctx.organizationId),
                eq(people.email, input.email),
              ),
            )
            .limit(1);
          if (byEmail) {
            await db
              .update(people)
              .set({
                name: input.name,
                headline: input.headline ?? byEmail.headline,
                location: input.location ?? byEmail.location,
                notes: input.notes ?? byEmail.notes,
                links: { ...(byEmail.links || {}), ...links },
                lastSeenAt: new Date(),
              })
              .where(eq(people.id, byEmail.id));
            return { id: byEmail.id, updated: true };
          }
        }

        const id = crypto.randomUUID();
        await db.insert(people).values({
          id,
          organizationId: ctx.organizationId,
          name: input.name,
          email: input.email,
          headline: input.headline,
          location: input.location,
          notes: input.notes,
          links,
        });
        return { id, created: true };
      },
    }),

    searchPeople: tool({
      description: "Search people in the org database by name, email, or headline.",
      inputSchema: z.object({
        query: z.string(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ query, limit }) => {
        const q = `%${query.trim()}%`;
        const list = await db
          .select()
          .from(people)
          .where(
            and(
              eq(people.organizationId, ctx.organizationId),
              or(
                ilike(people.name, q),
                ilike(people.email, q),
                ilike(people.headline, q),
              ),
            ),
          )
          .limit(limit);
        return { people: list };
      },
    }),

    listPeople: tool({
      description: "List recent people in the org database.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(25),
      }),
      execute: async ({ limit }) => {
        const list = await db
          .select()
          .from(people)
          .where(eq(people.organizationId, ctx.organizationId))
          .orderBy(desc(people.lastSeenAt))
          .limit(limit);
        return { people: list };
      },
    }),

    linkPersonToRole: tool({
      description: "Attach a person as a candidate on a recruiting role.",
      inputSchema: z.object({
        personId: z.string(),
        roleId: z.string(),
      }),
      execute: async ({ personId, roleId }) => {
        const [person] = await db
          .select()
          .from(people)
          .where(
            and(
              eq(people.id, personId),
              eq(people.organizationId, ctx.organizationId),
            ),
          )
          .limit(1);
        const [role] = await db
          .select()
          .from(roles)
          .where(
            and(
              eq(roles.id, roleId),
              eq(roles.organizationId, ctx.organizationId),
            ),
          )
          .limit(1);
        if (!person || !role) return { error: "Person or role not found" };

        const candidateId = crypto.randomUUID();
        await db.insert(candidates).values({
          id: candidateId,
          roleId,
          personId,
          name: person.name,
          headline: person.headline,
          stage: "discovered",
          currentAction: "Added from Sessions agent",
        });
        return { candidateId, linked: true };
      },
    }),

    setRoleRequirements: tool({
      description: "Replace structured requirements for a role.",
      inputSchema: z.object({
        roleId: z.string(),
        requirements: z.array(
          z.object({
            label: z.string(),
            priority: z.enum(["must-have", "preferred", "exclusion"]),
            verificationHints: z.array(z.string()).optional(),
            weight: z.number().int().optional(),
          }),
        ),
      }),
      execute: async ({ roleId, requirements }) => {
        const [role] = await db
          .select()
          .from(roles)
          .where(
            and(
              eq(roles.id, roleId),
              eq(roles.organizationId, ctx.organizationId),
            ),
          )
          .limit(1);
        if (!role) return { error: "Role not found" };

        await db.delete(roleRequirements).where(eq(roleRequirements.roleId, roleId));
        const rows = requirements.map((r, i) => ({
          id: crypto.randomUUID(),
          roleId,
          label: r.label,
          priority: r.priority,
          weight: r.weight ?? 1,
          sortOrder: i,
          verificationHints: r.verificationHints ?? [],
        }));
        if (rows.length) await db.insert(roleRequirements).values(rows);
        await db
          .update(roles)
          .set({
            claims: rows.map((r) => ({
              id: r.id,
              label: r.label,
              priority: r.priority,
              verificationHints: r.verificationHints,
              weight: r.weight,
            })),
            updatedAt: new Date(),
          })
          .where(eq(roles.id, roleId));
        return { count: rows.length };
      },
    }),

    setRolePerspectives: tool({
      description: "Replace structured perspectives for a role.",
      inputSchema: z.object({
        roleId: z.string(),
        perspectives: z.array(
          z.object({
            kind: z.enum([
              "company",
              "team",
              "hiring_manager",
              "candidate",
              "market",
            ]),
            title: z.string(),
            body: z.string(),
          }),
        ),
      }),
      execute: async ({ roleId, perspectives }) => {
        const [role] = await db
          .select()
          .from(roles)
          .where(
            and(
              eq(roles.id, roleId),
              eq(roles.organizationId, ctx.organizationId),
            ),
          )
          .limit(1);
        if (!role) return { error: "Role not found" };

        await db.delete(rolePerspectives).where(eq(rolePerspectives.roleId, roleId));
        const rows = perspectives.map((p) => ({
          id: crypto.randomUUID(),
          roleId,
          kind: p.kind,
          title: p.title,
          body: p.body,
        }));
        if (rows.length) await db.insert(rolePerspectives).values(rows);
        return { count: rows.length };
      },
    }),
  };
}
