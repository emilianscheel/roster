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
    return {
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
