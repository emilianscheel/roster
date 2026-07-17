import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { approvalTasks, roles, zeroCalls } from "@/lib/db/schema";
import { isOrgZeroLive } from "@/lib/zero/connection";
import {
  centsToMaxPay,
  getOrgZeroClient,
  usdToLedgerDollars,
} from "@/lib/zero/sdk";

export const ACTION_CAPABILITIES = new Set([
  "contact.unlock",
  "outreach.email",
  "outreach.followup",
  "outreach.call",
]);

export type ZeroCallInput = {
  organizationId: string;
  roleId?: string | null;
  candidateId?: string | null;
  service: string;
  capability: string;
  purpose: string;
  query?: string;
};

export type ZeroCallResult = {
  callId: string;
  status: "success" | "failed" | "skipped" | "blocked";
  data: unknown;
  actualCents: number;
  latencyMs: number;
  evidenceGained: number;
  blockedReason?: string;
  approvalTaskId?: string;
};

const DEMO_SERVICES = [
  {
    service: "profile-scraper",
    capability: "profile.extract",
    quotedCents: 0.2,
  },
  {
    service: "person-enrichment",
    capability: "person.enrich",
    quotedCents: 0.8,
  },
  {
    service: "targeted-search",
    capability: "web.search",
    quotedCents: 0.7,
  },
  {
    service: "github-signals",
    capability: "github.activity",
    quotedCents: 0.5,
  },
  {
    service: "contact-enrichment",
    capability: "contact.unlock",
    quotedCents: 2.5,
  },
  {
    service: "outreach-mail",
    capability: "outreach.email",
    quotedCents: 1.0,
  },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mockResearchData(input: ZeroCallInput) {
  const seed = (input.query || input.purpose || "candidate").slice(0, 40);
  if (
    input.capability.includes("discover") ||
    input.capability === "zero.discover"
  ) {
    return {
      services: DEMO_SERVICES.filter(
        (s) => !ACTION_CAPABILITIES.has(s.capability),
      ),
    };
  }
  if (
    input.capability.includes("search") ||
    input.capability === "profile.extract"
  ) {
    return {
      candidates: [
        {
          name: "Alex Rivera",
          headline: "Staff Infrastructure Engineer · Rust / K8s",
          strongestSignal: "Maintains production Rust networking crate",
          freshnessDays: 12,
        },
        {
          name: "Jordan Lee",
          headline: "Founding Platform Engineer",
          strongestSignal: "Recent OSS Kubernetes operator commits",
          freshnessDays: 8,
        },
        {
          name: "Sam Okonkwo",
          headline: "SRE → infra transition",
          strongestSignal: "Conference talk on production Rust services",
          freshnessDays: 21,
        },
      ],
      query: seed,
    };
  }
  if (input.capability.includes("enrich") || input.capability.includes("github")) {
    const slug =
      seed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "")
        .slice(0, 32) || "candidate";
    return {
      profile: {
        email: `${slug.split(".")[0] || "alex"}@example.com`,
        headline: "Staff Software Engineer · Distributed systems",
        location: "San Francisco Bay Area",
        links: {
          linkedin: `https://www.linkedin.com/in/${slug}`,
          github: `https://github.com/${slug.replace(/\./g, "")}`,
          twitter: `https://x.com/${slug.replace(/\./g, "")}`,
        },
        experiences: [
          {
            companyName: "Stripe",
            companyDomain: "stripe.com",
            title: "Staff Software Engineer",
            startDate: "2022-04",
            endDate: null,
            isCurrent: true,
            description:
              "Owns multi-region reliability for payments orchestration.",
          },
          {
            companyName: "Datadog",
            companyDomain: "datadoghq.com",
            title: "Senior Software Engineer",
            startDate: "2019-01",
            endDate: "2022-03",
            isCurrent: false,
            description: "High-cardinality metrics ingestion pipelines.",
          },
        ],
        education: [
          {
            schoolName: "Carnegie Mellon University",
            schoolDomain: "cmu.edu",
            degree: "B.S.",
            field: "Computer Science",
            startDate: "2012",
            endDate: "2016",
            description: null,
          },
        ],
        skills: ["Rust", "Go", "Kubernetes", "PostgreSQL"],
        summary: `Demo enrichment for ${seed}`,
      },
      claims: [
        {
          label: "Production Rust",
          status: "verified",
          sources: ["GitHub rust-net repo", "Employer engineering blog"],
          confidence: 0.94,
        },
        {
          label: "Kubernetes",
          status: "verified",
          sources: ["K8s operator commits (60d)"],
          confidence: 0.91,
        },
        {
          label: "Open to opportunities",
          status: "uncertain",
          supporting: "Recent departure signal",
          contradicting: "Personal site says not considering roles",
          confidence: 0.48,
        },
      ],
      subject: seed,
    };
  }
  return { ok: true, note: `Demo result for ${input.capability}`, query: seed };
}

function evidenceFromData(data: unknown): number {
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { claims?: unknown[] }).claims)
  ) {
    return (data as { claims: unknown[] }).claims.length;
  }
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { candidates?: unknown[] }).candidates)
  ) {
    return (data as { candidates: unknown[] }).candidates.length;
  }
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { services?: unknown[] }).services)
  ) {
    return (data as { services: unknown[] }).services.length;
  }
  return data == null ? 0 : 1;
}

async function resolveMaxPay(roleId?: string | null): Promise<string> {
  if (!roleId) return "0.05";
  const [role] = await db
    .select({ maxToolCallCents: roles.maxToolCallCents })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  return centsToMaxPay(role?.maxToolCallCents ?? 50);
}

async function bumpRoleSpend(roleId: string | null | undefined, dollars: number) {
  if (!roleId || dollars <= 0) return;
  const [role] = await db
    .select({ spentCents: roles.spentCents })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  if (!role) return;
  const addCents = Math.round(dollars * 100);
  await db
    .update(roles)
    .set({ spentCents: role.spentCents + addCents })
    .where(eq(roles.id, roleId));
}

async function liveZeroCall(
  input: ZeroCallInput,
  callId: string,
  started: number,
): Promise<ZeroCallResult> {
  const client = await getOrgZeroClient(input.organizationId);
  if (!client) {
    const latencyMs = Date.now() - started;
    await db.insert(zeroCalls).values({
      id: callId,
      organizationId: input.organizationId,
      roleId: input.roleId ?? null,
      candidateId: input.candidateId ?? null,
      service: input.service,
      capability: input.capability,
      purpose: input.purpose,
      quotedCents: 0,
      actualCents: 0,
      latencyMs,
      status: "failed",
      evidenceGained: 0,
      fallbackReason: "Zero session missing — reconnect in Get started",
      resultSummary: "No Zero session",
      demo: false,
    });
    return {
      callId,
      status: "failed",
      data: null,
      actualCents: 0,
      latencyMs,
      evidenceGained: 0,
      blockedReason: "Zero session missing. Reconnect in Get started.",
    };
  }

  const searchQuery =
    input.query ||
    input.purpose ||
    `${input.capability} recruiting enrichment`;

  try {
    const { capabilities } = await client.search(searchQuery, {
      maxCost: await resolveMaxPay(input.roleId),
      limit: 8,
    });

    if (
      input.capability.includes("discover") ||
      input.capability === "zero.discover"
    ) {
      const services = capabilities.map((cap) => ({
        service: cap.slug || cap.name,
        capability: cap.slug || cap.id,
        quotedCents: usdToLedgerDollars(cap.cost?.amount),
        url: cap.url,
        name: cap.name,
        token: cap.token,
      }));
      const latencyMs = Date.now() - started;
      await db.insert(zeroCalls).values({
        id: callId,
        organizationId: input.organizationId,
        roleId: input.roleId ?? null,
        candidateId: input.candidateId ?? null,
        service: "zero",
        capability: input.capability,
        purpose: input.purpose,
        quotedCents: 0,
        actualCents: 0,
        latencyMs,
        status: "success",
        evidenceGained: services.length,
        resultSummary: `Discovered ${services.length} capabilities`,
        demo: false,
      });
      return {
        callId,
        status: "success",
        data: { services },
        actualCents: 0,
        latencyMs,
        evidenceGained: services.length,
      };
    }

    const cap = capabilities[0];
    if (!cap?.url) {
      const latencyMs = Date.now() - started;
      await db.insert(zeroCalls).values({
        id: callId,
        organizationId: input.organizationId,
        roleId: input.roleId ?? null,
        candidateId: input.candidateId ?? null,
        service: input.service,
        capability: input.capability,
        purpose: input.purpose,
        quotedCents: 0,
        actualCents: 0,
        latencyMs,
        status: "failed",
        evidenceGained: 0,
        fallbackReason: "No matching Zero capability",
        resultSummary: "Empty search",
        demo: false,
      });
      return {
        callId,
        status: "failed",
        data: null,
        actualCents: 0,
        latencyMs,
        evidenceGained: 0,
        blockedReason: "No matching Zero capability for this query",
      };
    }

    const quoted = usdToLedgerDollars(cap.cost?.amount);
    const maxPay = await resolveMaxPay(input.roleId);
    const detail = await client.capabilities.get(cap.token || cap.id);
    const method = (detail.method || cap.method || "GET").toUpperCase();
    const body =
      method === "GET"
        ? undefined
        : JSON.stringify(
            detail.exampleRequest ?? {
              query: input.query || input.purpose,
              purpose: input.purpose,
            },
          );

    const result = await client.fetch(cap.url, {
      method,
      headers:
        method === "GET"
          ? undefined
          : { "Content-Type": "application/json" },
      body,
      maxPay,
      capabilityId: cap.token || cap.id,
    });

    const latencyMs = result.latencyMs || Date.now() - started;
    const paid = usdToLedgerDollars(result.payment?.amount);

    if (result.outcome === "insufficient_funds") {
      await db.insert(zeroCalls).values({
        id: callId,
        organizationId: input.organizationId,
        roleId: input.roleId ?? null,
        candidateId: input.candidateId ?? null,
        service: cap.slug || input.service,
        capability: input.capability,
        purpose: input.purpose,
        quotedCents: quoted,
        actualCents: 0,
        latencyMs,
        status: "failed",
        evidenceGained: 0,
        fallbackReason: "Insufficient Zero wallet balance",
        resultSummary: "Fund wallet in Get started",
        demo: false,
      });
      return {
        callId,
        status: "failed",
        data: null,
        actualCents: 0,
        latencyMs,
        evidenceGained: 0,
        blockedReason:
          "Insufficient Zero funds. Open Get started to top up your wallet.",
      };
    }

    if (!result.ok || result.outcome !== "success") {
      await db.insert(zeroCalls).values({
        id: callId,
        organizationId: input.organizationId,
        roleId: input.roleId ?? null,
        candidateId: input.candidateId ?? null,
        service: cap.slug || input.service,
        capability: input.capability,
        purpose: input.purpose,
        quotedCents: quoted,
        actualCents: paid,
        latencyMs,
        status: "failed",
        evidenceGained: 0,
        fallbackReason: `Zero fetch outcome: ${result.outcome}`,
        resultSummary: result.outcome,
        demo: false,
      });
      if (paid > 0) await bumpRoleSpend(input.roleId, paid);
      return {
        callId,
        status: "failed",
        data: result.body,
        actualCents: paid,
        latencyMs,
        evidenceGained: 0,
        blockedReason: `Zero call failed (${result.outcome})`,
      };
    }

    const data = result.body;
    const evidenceGained = evidenceFromData(data);
    await db.insert(zeroCalls).values({
      id: callId,
      organizationId: input.organizationId,
      roleId: input.roleId ?? null,
      candidateId: input.candidateId ?? null,
      service: cap.slug || input.service,
      capability: input.capability,
      purpose: input.purpose,
      quotedCents: quoted,
      actualCents: paid || quoted,
      latencyMs,
      status: "success",
      evidenceGained,
      resultSummary: `Live ${cap.name}`,
      demo: false,
    });
    if ((paid || quoted) > 0) await bumpRoleSpend(input.roleId, paid || quoted);

    return {
      callId,
      status: "success",
      data,
      actualCents: paid || quoted,
      latencyMs,
      evidenceGained,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const message = err instanceof Error ? err.message : "Zero call error";
    await db.insert(zeroCalls).values({
      id: callId,
      organizationId: input.organizationId,
      roleId: input.roleId ?? null,
      candidateId: input.candidateId ?? null,
      service: input.service,
      capability: input.capability,
      purpose: input.purpose,
      quotedCents: 0,
      actualCents: 0,
      latencyMs,
      status: "failed",
      evidenceGained: 0,
      fallbackReason: message,
      resultSummary: "Live Zero error",
      demo: false,
    });
    return {
      callId,
      status: "failed",
      data: null,
      actualCents: 0,
      latencyMs,
      evidenceGained: 0,
      blockedReason: message,
    };
  }
}

export async function discoverServices(input: {
  organizationId: string;
  roleId?: string;
  purpose: string;
}) {
  return zeroCall({
    organizationId: input.organizationId,
    roleId: input.roleId,
    service: "zero",
    capability: "zero.discover",
    purpose: input.purpose,
  });
}

export async function zeroCall(input: ZeroCallInput): Promise<ZeroCallResult> {
  const started = Date.now();
  const callId = crypto.randomUUID();
  const live = await isOrgZeroLive(input.organizationId);

  if (ACTION_CAPABILITIES.has(input.capability)) {
    const kind =
      input.capability === "contact.unlock"
        ? "unlock_contact"
        : input.capability === "outreach.followup"
          ? "start_followup"
          : input.capability === "outreach.call"
            ? "place_call"
            : "send_outreach";

    const approvalId = crypto.randomUUID();
    await db.insert(approvalTasks).values({
      id: approvalId,
      organizationId: input.organizationId,
      roleId: input.roleId ?? null,
      candidateId: input.candidateId ?? null,
      kind,
      title: `${input.service} · ${input.capability}`,
      payload: {
        service: input.service,
        capability: input.capability,
        purpose: input.purpose,
        query: input.query,
        demo: !live,
      },
      status: "pending",
    });

    const latencyMs = Date.now() - started;
    await db.insert(zeroCalls).values({
      id: callId,
      organizationId: input.organizationId,
      roleId: input.roleId ?? null,
      candidateId: input.candidateId ?? null,
      service: input.service,
      capability: input.capability,
      purpose: input.purpose,
      quotedCents: 1,
      actualCents: 0,
      latencyMs,
      status: "blocked",
      evidenceGained: 0,
      fallbackReason: "Human approval required",
      resultSummary: "Redirected to Approvals",
      demo: !live,
    });

    return {
      callId,
      status: "blocked",
      data: null,
      actualCents: 0,
      latencyMs,
      evidenceGained: 0,
      blockedReason: "Human approval required",
      approvalTaskId: approvalId,
    };
  }

  if (live) {
    return liveZeroCall(input, callId, started);
  }

  const quoted =
    DEMO_SERVICES.find((s) => s.capability === input.capability)?.quotedCents ??
    0.5;
  await sleep(150 + Math.floor(Math.random() * 250));
  const data = mockResearchData(input);
  const latencyMs = Date.now() - started;
  const evidenceGained = evidenceFromData(data);

  await db.insert(zeroCalls).values({
    id: callId,
    organizationId: input.organizationId,
    roleId: input.roleId ?? null,
    candidateId: input.candidateId ?? null,
    service: input.service,
    capability: input.capability,
    purpose: input.purpose,
    quotedCents: quoted,
    actualCents: quoted,
    latencyMs,
    status: "success",
    evidenceGained,
    resultSummary: `Demo ${input.capability}`,
    demo: true,
  });

  return {
    callId,
    status: "success",
    data,
    actualCents: quoted,
    latencyMs,
    evidenceGained,
  };
}

export function listDemoCapabilities() {
  return DEMO_SERVICES;
}
