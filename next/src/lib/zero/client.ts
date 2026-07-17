import { db } from "@/lib/db";
import { approvalTasks, zeroCalls } from "@/lib/db/schema";

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

function isDemoMode() {
  return process.env.DEMO_MODE !== "false";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mockResearchData(input: ZeroCallInput) {
  const seed = (input.query || input.purpose || "candidate").slice(0, 40);
  if (input.capability.includes("discover") || input.capability === "zero.discover") {
    return {
      services: DEMO_SERVICES.filter((s) => !ACTION_CAPABILITIES.has(s.capability)),
    };
  }
  if (input.capability.includes("search") || input.capability === "profile.extract") {
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
    const slug = seed
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
  const demo = isDemoMode();
  const callId = crypto.randomUUID();

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
        demo: true,
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
      fallbackReason: "Human approval required (demo safety)",
      resultSummary: "Redirected to Approvals",
      demo: true,
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

  const quoted =
    DEMO_SERVICES.find((s) => s.capability === input.capability)?.quotedCents ??
    0.5;
  await sleep(150 + Math.floor(Math.random() * 250));
  const data = mockResearchData(input);
  const latencyMs = Date.now() - started;
  const evidenceGained = Array.isArray(
    (data as { claims?: unknown[] }).claims,
  )
    ? ((data as { claims: unknown[] }).claims.length)
    : Array.isArray((data as { candidates?: unknown[] }).candidates)
      ? ((data as { candidates: unknown[] }).candidates.length)
      : 1;

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
    resultSummary: demo
      ? `Demo ${input.capability}`
      : `Live ${input.capability}`,
    demo,
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
