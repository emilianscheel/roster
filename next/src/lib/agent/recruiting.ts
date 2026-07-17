import { tool } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  approvalTasks,
  candidates,
  evidence,
  knowledgeSnippets,
  people,
  rolePerspectives,
  roleRequirements,
  roles,
  type Claim,
} from "@/lib/db/schema";
import { discoverServices, zeroCall } from "@/lib/zero/client";

export type RecruitingContext = {
  organizationId: string;
  roleId: string;
  userId: string;
};

function titleFromBrief(brief: string) {
  const first = brief.trim().split(/[\n.!?]/)[0]?.trim() || "Untitled role";
  return first.length > 72 ? `${first.slice(0, 69)}…` : first;
}

async function compileClaims(
  ctx: RecruitingContext,
  claims: Omit<Claim, "id">[],
  meta?: {
    seniority?: string;
    location?: string;
    employmentType?: string;
    perspectives?: {
      kind: "company" | "team" | "hiring_manager" | "candidate" | "market";
      title: string;
      body: string;
    }[];
  },
) {
  const compiled: Claim[] = claims.map((c) => ({
    id: crypto.randomUUID(),
    ...c,
  }));
  const [role] = await db.select().from(roles).where(eq(roles.id, ctx.roleId)).limit(1);

  await db
    .update(roles)
    .set({
      claims: compiled,
      title: titleFromBrief(role?.brief || "Role"),
      seniority: meta?.seniority ?? role?.seniority,
      location: meta?.location ?? role?.location,
      employmentType: meta?.employmentType ?? role?.employmentType,
      status: "sourcing",
      updatedAt: new Date(),
    })
    .where(eq(roles.id, ctx.roleId));

  await db.delete(roleRequirements).where(eq(roleRequirements.roleId, ctx.roleId));
  if (compiled.length) {
    await db.insert(roleRequirements).values(
      compiled.map((c, i) => ({
        id: c.id,
        roleId: ctx.roleId,
        label: c.label,
        priority: c.priority,
        weight: c.weight ?? 1,
        sortOrder: i,
        verificationHints: c.verificationHints ?? [],
      })),
    );
  }

  if (meta?.perspectives?.length) {
    await db.delete(rolePerspectives).where(eq(rolePerspectives.roleId, ctx.roleId));
    await db.insert(rolePerspectives).values(
      meta.perspectives.map((p) => ({
        id: crypto.randomUUID(),
        roleId: ctx.roleId,
        kind: p.kind,
        title: p.title,
        body: p.body,
      })),
    );
  }

  return compiled;
}

async function searchCandidates(
  ctx: RecruitingContext,
  query: string,
  service = "profile-scraper",
) {
  const result = await zeroCall({
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    service,
    capability: "profile.extract",
    purpose: "Initial candidate pool",
    query,
  });
  const found =
    (
      result.data as {
        candidates?: {
          name: string;
          headline?: string;
          strongestSignal?: string;
          freshnessDays?: number;
        }[];
      }
    )?.candidates || [];

  const created: { id: string; name: string }[] = [];
  for (const c of found) {
    const personId = crypto.randomUUID();
    await db.insert(people).values({
      id: personId,
      organizationId: ctx.organizationId,
      name: c.name,
      headline: c.headline,
      firstSeenRoleId: ctx.roleId,
    });
    const candidateId = crypto.randomUUID();
    await db.insert(candidates).values({
      id: candidateId,
      roleId: ctx.roleId,
      personId,
      name: c.name,
      headline: c.headline,
      stage: "discovered",
      strongestSignal: c.strongestSignal,
      freshnessDays: c.freshnessDays,
      currentAction: "Discovered",
      matchScore: 0.55,
      evidenceConfidence: 0.2,
    });
    created.push({ id: candidateId, name: c.name });
  }
  return { callId: result.callId, candidates: created };
}

async function verifyCandidate(
  ctx: RecruitingContext,
  candidateId: string,
  focus?: string,
) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!candidate) return { error: "Candidate not found" };

  const [role] = await db.select().from(roles).where(eq(roles.id, ctx.roleId)).limit(1);

  await db
    .update(candidates)
    .set({
      stage: "researching",
      currentAction: focus || "Verifying claims",
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, candidateId));

  const result = await zeroCall({
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    candidateId,
    service: "targeted-search",
    capability: "web.search",
    purpose: focus || `Verify ${candidate.name}`,
    query: candidate.name,
  });

  const claims =
    (
      result.data as {
        claims?: {
          label: string;
          status: string;
          sources?: string[];
          confidence?: number;
          supporting?: string;
          contradicting?: string;
        }[];
      }
    )?.claims || [];

  const reqs = await db
    .select()
    .from(roleRequirements)
    .where(eq(roleRequirements.roleId, ctx.roleId));
  const roleClaims: Claim[] =
    reqs.length > 0
      ? reqs.map((r) => ({
          id: r.id,
          label: r.label,
          priority: r.priority,
          verificationHints: r.verificationHints ?? [],
          weight: r.weight,
        }))
      : ((role?.claims as Claim[]) || []);
  for (const claim of claims) {
    const matched = roleClaims[0];
    await db.insert(evidence).values({
      id: crypto.randomUUID(),
      candidateId,
      claimId: matched?.id || crypto.randomUUID(),
      claimLabel: claim.label,
      status:
        claim.status === "verified"
          ? "verified"
          : claim.status === "uncertain"
            ? "uncertain"
            : "contradicting",
      sources: (claim.sources || []).map((title) => ({ title })),
      confidence: claim.confidence || 0.5,
      crossSourceAgreement: `${claim.sources?.length || 0}/${claim.sources?.length || 0}`,
      newestEvidenceDays: candidate.freshnessDays,
      costCents: result.actualCents,
      supporting: claim.supporting,
      contradicting: claim.contradicting,
      recommendation:
        claim.status === "uncertain"
          ? "Require manual review before outreach."
          : undefined,
    });
  }

  const verified = claims.filter((c) => c.status === "verified").length;
  const uncertain = claims.filter((c) => c.status === "uncertain");
  const confidence =
    claims.reduce((s, c) => s + (c.confidence || 0), 0) / Math.max(claims.length, 1);
  const spendAdd = Math.round(result.actualCents * 100);

  await db
    .update(candidates)
    .set({
      stage: uncertain.length ? "researching" : "verified",
      matchScore: Math.min(0.98, 0.6 + verified * 0.1),
      evidenceConfidence: confidence,
      contradictions: uncertain.map((u) => u.contradicting || u.label),
      missingRequirements: [],
      verificationSpendCents: candidate.verificationSpendCents + spendAdd,
      currentAction: uncertain.length
        ? "Needs review on availability"
        : "Verified",
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, candidateId));

  if (role) {
    await db
      .update(roles)
      .set({
        spentCents: role.spentCents + spendAdd,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, ctx.roleId));
  }

  return { callId: result.callId, verified, uncertain: uncertain.length, confidence };
}

async function proposeOutreach(
  ctx: RecruitingContext,
  candidateId: string,
  draft: string,
) {
  await db
    .update(candidates)
    .set({
      outreachDraft: draft,
      stage: "approved",
      currentAction: "Awaiting outreach approval",
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, candidateId));

  const approvalId = crypto.randomUUID();
  await db.insert(approvalTasks).values({
    id: approvalId,
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    candidateId,
    kind: "send_outreach",
    title: "Send outreach",
    payload: { draft, demo: true },
    status: "pending",
  });

  await zeroCall({
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    candidateId,
    service: "outreach-mail",
    capability: "outreach.email",
    purpose: "Send personalized outreach",
  });

  return { approvalTaskId: approvalId, status: "pending_approval" as const };
}

async function distillKnowledge(
  ctx: RecruitingContext,
  input: { title: string; markdown: string; tool?: string; tags?: string[] },
) {
  const id = crypto.randomUUID();
  await db.insert(knowledgeSnippets).values({
    id,
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    title: input.title,
    markdown: input.markdown,
    tool: input.tool,
    tags: input.tags || [],
  });
  return { id, saved: true };
}

export function createRecruitingTools(ctx: RecruitingContext) {
  return {
    compileClaims: tool({
      description: "Compile the hiring brief into must-haves, preferences, and exclusions.",
      inputSchema: z.object({
        claims: z.array(
          z.object({
            label: z.string(),
            priority: z.enum(["must-have", "preferred", "exclusion"]),
            verificationHints: z.array(z.string()).optional(),
          }),
        ),
        seniority: z.string().optional(),
        location: z.string().optional(),
        employmentType: z.string().optional(),
        perspectives: z
          .array(
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
          )
          .optional(),
      }),
      execute: async ({ claims, seniority, location, employmentType, perspectives }) =>
        compileClaims(ctx, claims, {
          seniority,
          location,
          employmentType,
          perspectives,
        }),
    }),

    discoverZeroServices: tool({
      description: "Discover relevant Zero capabilities for this role.",
      inputSchema: z.object({ purpose: z.string() }),
      execute: async ({ purpose }) =>
        discoverServices({
          organizationId: ctx.organizationId,
          roleId: ctx.roleId,
          purpose,
        }),
    }),

    searchCandidates: tool({
      description: "Run a low-cost candidate search via Zero.",
      inputSchema: z.object({
        query: z.string(),
        service: z.string().default("profile-scraper"),
      }),
      execute: async ({ query, service }) => searchCandidates(ctx, query, service),
    }),

    verifyCandidate: tool({
      description: "Investigate claims for a candidate with targeted Zero research.",
      inputSchema: z.object({
        candidateId: z.string(),
        focus: z.string().optional(),
      }),
      execute: async ({ candidateId, focus }) =>
        verifyCandidate(ctx, candidateId, focus),
    }),

    proposeOutreach: tool({
      description:
        "Draft evidence-grounded outreach and create a human approval task. Never sends.",
      inputSchema: z.object({
        candidateId: z.string(),
        draft: z.string(),
      }),
      execute: async ({ candidateId, draft }) =>
        proposeOutreach(ctx, candidateId, draft),
    }),

    distillKnowledge: tool({
      description: "Propose a best-practices markdown snippet from this workflow.",
      inputSchema: z.object({
        title: z.string(),
        markdown: z.string(),
        tool: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
      execute: async (input) => distillKnowledge(ctx, input),
    }),
  };
}

/** Deterministic demo sourcing loop when no LLM key is configured. */
export async function runDemoRecruitingLoop(ctx: RecruitingContext, brief: string) {
  const steps: string[] = [];

  steps.push("Compiling claims from brief…");
  await compileClaims(
    ctx,
    [
      {
        label: "Production Rust",
        priority: "must-have",
        verificationHints: ["GitHub", "technical writing"],
      },
      {
        label: "Kubernetes",
        priority: "must-have",
        verificationHints: ["Projects", "profile"],
      },
      { label: "Startup experience", priority: "must-have" },
      { label: "Recent OSS activity", priority: "must-have" },
      { label: "Transition signal", priority: "preferred" },
    ],
    {
      seniority: "Staff / founding",
      location: "Remote / Bay Area",
      employmentType: "Full-time",
      perspectives: [
        {
          kind: "company",
          title: "Company",
          body: "Early agentic-AI startup hiring a founding infrastructure engineer.",
        },
        {
          kind: "candidate",
          title: "Candidate fit",
          body: "Strong production Rust + Kubernetes signal with recent OSS activity and openness to a new role.",
        },
      ],
    },
  );

  steps.push("Discovering Zero capabilities…");
  await discoverServices({
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    purpose: "Find search and enrichment services",
  });

  steps.push("Searching candidates…");
  const search = await searchCandidates(ctx, brief.slice(0, 120));

  for (const c of search.candidates) {
    steps.push(`Verifying ${c.name}…`);
    await verifyCandidate(ctx, c.id, "Must-have evidence");
  }

  if (search.candidates[0]) {
    const c = search.candidates[0];
    steps.push(`Drafting outreach for ${c.name}…`);
    await proposeOutreach(
      ctx,
      c.id,
      `Hi ${c.name},\n\nYour production Rust and Kubernetes work stood out — especially recent OSS activity. Would you be open to a short conversation about a founding infrastructure role?\n\n— Roster (demo)`,
    );
  }

  steps.push("Distilling knowledge…");
  await distillKnowledge(ctx, {
    title: "Cheap search before deep enrichment",
    markdown:
      "## When to use profile-scraper first\n\nUse low-cost profile extraction to build a pool, reject hard mismatches, then buy targeted evidence only for remaining claims.",
    tool: "profile-scraper",
    tags: ["cost", "funnel"],
  });

  await db
    .update(roles)
    .set({ status: "review", updatedAt: new Date() })
    .where(eq(roles.id, ctx.roleId));

  return steps;
}
