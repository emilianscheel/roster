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
import { applyPersonEnrichment } from "@/lib/people/apply-enrichment";
import { discoverServices, zeroCall } from "@/lib/zero/client";
import type { MockClaim, MockPersonProfile } from "@/lib/zero/mock-types";
import { researchProfileToEnrichResult } from "@/lib/zero/mock-person-enrich";

export type RecruitingContext = {
  organizationId: string;
  roleId: string;
  userId: string;
};

type DemoTheme = "founding_infra" | "shortlist_three" | "sre_transition";

function titleFromBrief(brief: string) {
  const first = brief.trim().split(/[\n.!?]/)[0]?.trim() || "Untitled role";
  return first.length > 72 ? `${first.slice(0, 69)}…` : first;
}

function detectDemoTheme(brief: string): DemoTheme {
  const b = brief.toLowerCase();
  if (
    b.includes("sre") ||
    b.includes("transitioning from") ||
    b.includes("qualify cheaply") ||
    b.includes("platform engineers transitioning")
  ) {
    return "sre_transition";
  }
  if (
    b.includes("shortlist") ||
    b.includes("three engineers") ||
    b.includes("three founding") ||
    b.includes("evidence before outreach")
  ) {
    return "shortlist_three";
  }
  return "founding_infra";
}

function normalizeLabel(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function matchRoleClaim(
  claimLabel: string,
  roleClaims: Claim[],
): Claim | undefined {
  const needle = normalizeLabel(claimLabel);
  const exact = roleClaims.find((r) => normalizeLabel(r.label) === needle);
  if (exact) return exact;
  return roleClaims.find((r) => {
    const hay = normalizeLabel(r.label);
    return hay.includes(needle) || needle.includes(hay);
  });
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
          location?: string;
        }[];
      }
    )?.candidates || [];

  const created: { id: string; name: string; personId: string }[] = [];
  for (const c of found) {
    const personId = crypto.randomUUID();
    await db.insert(people).values({
      id: personId,
      organizationId: ctx.organizationId,
      name: c.name,
      headline: c.headline,
      location: c.location,
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
    created.push({ id: candidateId, name: c.name, personId });
  }
  return { callId: result.callId, candidates: created };
}

async function enrichCandidatePerson(
  ctx: RecruitingContext,
  candidateId: string,
) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!candidate?.personId) return { error: "Candidate not found" };

  const result = await zeroCall({
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    candidateId,
    service: "person-enrichment",
    capability: "person.enrich",
    purpose: `Enrich career history for ${candidate.name}`,
    query: candidate.name,
  });

  const data = result.data as {
    profile?: MockPersonProfile;
    claims?: MockClaim[];
  } | null;

  if (data?.profile) {
    await applyPersonEnrichment({
      personId: candidate.personId,
      organizationId: ctx.organizationId,
      toolId: "pdl-person-enrich",
      result: researchProfileToEnrichResult(data.profile, data.claims ?? []),
    });
    await db
      .update(candidates)
      .set({
        headline: data.profile.headline || candidate.headline,
        currentAction: "Career history enriched",
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, candidateId));
  }

  return { callId: result.callId, enriched: Boolean(data?.profile) };
}

async function githubSignalCandidate(
  ctx: RecruitingContext,
  candidateId: string,
) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!candidate) return { error: "Candidate not found" };

  const result = await zeroCall({
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    candidateId,
    service: "github-signals",
    capability: "github.activity",
    purpose: `OSS freshness for ${candidate.name}`,
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
  const roleClaims: Claim[] = reqs.map((r) => ({
    id: r.id,
    label: r.label,
    priority: r.priority,
    verificationHints: r.verificationHints ?? [],
    weight: r.weight,
  }));

  for (const claim of claims) {
    const matched = matchRoleClaim(claim.label, roleClaims);
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
    });
  }

  return { callId: result.callId, claims: claims.length };
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
    const matched = matchRoleClaim(claim.label, roleClaims) ?? roleClaims[0];
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
          : claim.status === "contradicting"
            ? "Hard mismatch — skip deep enrichment."
            : undefined,
    });
  }

  const verified = claims.filter((c) => c.status === "verified").length;
  const uncertain = claims.filter((c) => c.status === "uncertain");
  const contradicting = claims.filter((c) => c.status === "contradicting");
  const confidence =
    claims.reduce((s, c) => s + (c.confidence || 0), 0) / Math.max(claims.length, 1);
  const spendAdd = Math.round(result.actualCents * 100);
  const hardReject = contradicting.length >= 2;

  await db
    .update(candidates)
    .set({
      stage: hardReject
        ? "rejected"
        : uncertain.length
          ? "researching"
          : "verified",
      matchScore: hardReject
        ? Math.min(0.35, 0.2 + verified * 0.05)
        : Math.min(0.98, 0.55 + verified * 0.08),
      evidenceConfidence: confidence,
      contradictions: [
        ...uncertain.map((u) => u.contradicting || u.label),
        ...contradicting.map((c) => c.contradicting || c.label),
      ],
      missingRequirements: hardReject
        ? contradicting.map((c) => c.label)
        : [],
      verificationSpendCents: candidate.verificationSpendCents + spendAdd,
      currentAction: hardReject
        ? "Rejected — hard mismatch"
        : uncertain.length
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

  return {
    callId: result.callId,
    verified,
    uncertain: uncertain.length,
    contradicting: contradicting.length,
    confidence,
    rejected: hardReject,
  };
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

  const result = await zeroCall({
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    candidateId,
    service: "outreach-mail",
    capability: "outreach.email",
    purpose: "Send personalized outreach",
    query: draft.slice(0, 500),
  });

  if (result.approvalTaskId) {
    await db
      .update(approvalTasks)
      .set({
        title: "Send outreach",
        payload: {
          draft,
          service: "outreach-mail",
          capability: "outreach.email",
          demo: true,
        },
      })
      .where(eq(approvalTasks.id, result.approvalTaskId));
  }

  return {
    approvalTaskId: result.approvalTaskId,
    status: "pending_approval" as const,
  };
}

async function proposeUnlockContact(
  ctx: RecruitingContext,
  candidateId: string,
) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!candidate) return { error: "Candidate not found" };

  await db
    .update(candidates)
    .set({
      currentAction: "Awaiting contact unlock",
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, candidateId));

  const result = await zeroCall({
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    candidateId,
    service: "contact-enrichment",
    capability: "contact.unlock",
    purpose: `Unlock work email for ${candidate.name}`,
    query: candidate.name,
  });

  if (result.approvalTaskId) {
    await db
      .update(approvalTasks)
      .set({
        title: `Unlock contact · ${candidate.name}`,
      })
      .where(eq(approvalTasks.id, result.approvalTaskId));
  }

  return { approvalTaskId: result.approvalTaskId, status: "pending_approval" as const };
}

async function proposeFollowupOrCall(
  ctx: RecruitingContext,
  candidateId: string,
  kind: "outreach.followup" | "outreach.call",
) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!candidate) return { error: "Candidate not found" };

  const result = await zeroCall({
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    candidateId,
    service: kind === "outreach.call" ? "outreach-call" : "outreach-followup",
    capability: kind,
    purpose:
      kind === "outreach.call"
        ? `Schedule intro call with ${candidate.name}`
        : `Follow up with ${candidate.name}`,
    query: candidate.name,
  });

  return { approvalTaskId: result.approvalTaskId, status: "pending_approval" as const };
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

function themeCompileInput(theme: DemoTheme): {
  claims: Omit<Claim, "id">[];
  meta: {
    seniority: string;
    location: string;
    employmentType: string;
    perspectives: {
      kind: "company" | "team" | "hiring_manager" | "candidate" | "market";
      title: string;
      body: string;
    }[];
  };
} {
  if (theme === "sre_transition") {
    return {
      claims: [
        {
          label: "Kubernetes operators",
          priority: "must-have",
          verificationHints: ["GitHub operators", "Kubebuilder"],
        },
        {
          label: "Rust networking",
          priority: "preferred",
          verificationHints: ["GitHub", "talks"],
        },
        {
          label: "SRE → infrastructure transition",
          priority: "must-have",
          verificationHints: ["Headline", "role progression"],
        },
        {
          label: "Recent OSS activity",
          priority: "preferred",
          verificationHints: ["GitHub freshness"],
        },
      ],
      meta: {
        seniority: "Senior / Staff",
        location: "Remote / US",
        employmentType: "Full-time",
        perspectives: [
          {
            kind: "company",
            title: "Company",
            body: "Infra team wants platform engineers moving from SRE into operator and networking work.",
          },
          {
            kind: "candidate",
            title: "Candidate fit",
            body: "Prefer Kubernetes operator authors with Rust networking curiosity; qualify cheaply before deep enrichment.",
          },
          {
            kind: "market",
            title: "Market",
            body: "SRE→platform transitions are common; filter hard mismatches before buying enrich.",
          },
        ],
      },
    };
  }

  if (theme === "shortlist_three") {
    return {
      claims: [
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
        {
          label: "Recent OSS activity",
          priority: "must-have",
          verificationHints: ["GitHub <60d"],
        },
        { label: "Transition signal", priority: "preferred" },
      ],
      meta: {
        seniority: "Staff / founding",
        location: "Remote / Bay Area",
        employmentType: "Full-time",
        perspectives: [
          {
            kind: "company",
            title: "Company",
            body: "Agentic-AI startup needs a founding infrastructure engineer with evidence before any outreach.",
          },
          {
            kind: "hiring_manager",
            title: "Hiring manager",
            body: "Shortlist exactly three dossiers with verified must-haves; do not contact until evidence is in.",
          },
          {
            kind: "candidate",
            title: "Candidate fit",
            body: "Production Rust + Kubernetes, OSS within 60 days, startup tenure, and a current transition signal.",
          },
        ],
      },
    };
  }

  // founding_infra (default)
  return {
    claims: [
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
      {
        label: "Recent OSS activity",
        priority: "must-have",
        verificationHints: ["GitHub <60d"],
      },
      { label: "Open to opportunities", priority: "preferred" },
    ],
    meta: {
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
  };
}

/** Deterministic demo sourcing loop when no LLM key is configured. */
export async function runDemoRecruitingLoop(ctx: RecruitingContext, brief: string) {
  const steps: string[] = [];
  const theme = detectDemoTheme(brief);
  const compiled = themeCompileInput(theme);

  steps.push(`Compiling claims (${theme.replace(/_/g, " ")})…`);
  await compileClaims(ctx, compiled.claims, compiled.meta);

  steps.push("Discovering Zero capabilities…");
  await discoverServices({
    organizationId: ctx.organizationId,
    roleId: ctx.roleId,
    purpose: "Find search, github, enrichment, and outreach services",
  });

  steps.push("Searching candidates…");
  const search = await searchCandidates(ctx, brief.slice(0, 160));

  const survivors: { id: string; name: string; personId: string }[] = [];

  if (theme === "sre_transition") {
    // Cheap funnel: github first for all, verify, enrich only non-rejects
    for (const c of search.candidates) {
      steps.push(`GitHub signals for ${c.name}…`);
      await githubSignalCandidate(ctx, c.id);
      steps.push(`Verifying ${c.name}…`);
      const v = await verifyCandidate(ctx, c.id, "SRE→infra must-haves");
      if (!v || "error" in v || v.rejected) continue;
      survivors.push(c);
    }
    const enrichTargets = survivors.slice(0, 3);
    for (const c of enrichTargets) {
      steps.push(`Deep enrich ${c.name}…`);
      await enrichCandidatePerson(ctx, c.id);
    }
  } else {
    for (const c of search.candidates) {
      steps.push(`Verifying ${c.name}…`);
      const v = await verifyCandidate(ctx, c.id, "Must-have evidence");
      if (!v || "error" in v || v.rejected) continue;
      survivors.push(c);
    }
    const enrichCount = theme === "shortlist_three" ? 3 : 4;
    for (const c of survivors.slice(0, enrichCount)) {
      steps.push(`Enriching career history for ${c.name}…`);
      await enrichCandidatePerson(ctx, c.id);
      if (theme === "shortlist_three" || theme === "founding_infra") {
        steps.push(`GitHub activity for ${c.name}…`);
        await githubSignalCandidate(ctx, c.id);
      }
    }
  }

  const outreachPool =
    theme === "shortlist_three"
      ? survivors.slice(0, 3)
      : survivors.slice(0, Math.max(2, Math.min(survivors.length, 3)));

  if (outreachPool[0]) {
    const c = outreachPool[0];
    steps.push(`Drafting outreach for ${c.name}…`);
    const draft =
      theme === "sre_transition"
        ? `Hi ${c.name},\n\nYour Kubernetes operator work and SRE→infra path stood out. Would you be open to a short conversation about a platform/infrastructure role?\n\n— Roster (demo)`
        : `Hi ${c.name},\n\nYour production Rust and Kubernetes work stood out — especially recent OSS activity. Would you be open to a short conversation about a founding infrastructure role?\n\n— Roster (demo)`;
    await proposeOutreach(ctx, c.id, draft);
  }

  if (outreachPool[1]) {
    steps.push(`Requesting contact unlock for ${outreachPool[1].name}…`);
    await proposeUnlockContact(ctx, outreachPool[1].id);
  }

  if (outreachPool[2] && theme === "shortlist_three") {
    steps.push(`Drafting outreach for ${outreachPool[2].name}…`);
    await proposeOutreach(
      ctx,
      outreachPool[2].id,
      `Hi ${outreachPool[2].name},\n\nWe're shortlisting three founding infra candidates with verified Rust/K8s evidence. Your profile cleared the bar — open to a brief intro?\n\n— Roster (demo)`,
    );
  } else if (outreachPool[2] || outreachPool[1]) {
    const target = outreachPool[2] ?? outreachPool[1]!;
    steps.push(`Queuing follow-up for ${target.name}…`);
    await proposeFollowupOrCall(ctx, target.id, "outreach.followup");
  }

  if (survivors[0] && theme === "founding_infra") {
    steps.push(`Queuing intro call approval for ${survivors[0].name}…`);
    await proposeFollowupOrCall(ctx, survivors[0].id, "outreach.call");
  }

  steps.push("Distilling knowledge…");
  if (theme === "sre_transition") {
    await distillKnowledge(ctx, {
      title: "Qualify cheaply before deep enrichment",
      markdown:
        "## SRE → infra funnel\n\n1. Cheap profile extract\n2. GitHub activity for operator/Rust signals\n3. Targeted verify\n4. Reject hard mismatches\n5. Deep enrich only survivors\n\nSaves enrich spend on frontend false-positives.",
      tool: "github-signals",
      tags: ["cost", "funnel", "sre"],
    });
  } else if (theme === "shortlist_three") {
    await distillKnowledge(ctx, {
      title: "Evidence before outreach",
      markdown:
        "## Shortlist discipline\n\nVerify must-haves for every shortlisted candidate, persist career history, then create outreach approvals only for dossiers with evidence. Never contact from search alone.",
      tool: "targeted-search",
      tags: ["evidence", "outreach", "shortlist"],
    });
  } else {
    await distillKnowledge(ctx, {
      title: "Cheap search before deep enrichment",
      markdown:
        "## When to use profile-scraper first\n\nUse low-cost profile extraction to build a pool, reject hard mismatches, then buy targeted evidence and career enrich only for remaining claims.",
      tool: "profile-scraper",
      tags: ["cost", "funnel"],
    });
  }

  await db
    .update(roles)
    .set({ status: "review", updatedAt: new Date() })
    .where(eq(roles.id, ctx.roleId));

  return steps;
}
