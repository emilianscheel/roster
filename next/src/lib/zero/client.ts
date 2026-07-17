import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { approvalTasks, roles, zeroCalls } from "@/lib/db/schema";
import { isOrgZeroLive } from "@/lib/zero/connection";
import {
  ACTION_CAPABILITIES,
  DEMO_SERVICES,
  listDemoCapabilities,
  mockResearchData,
} from "@/lib/zero/mock-research";
import {
  centsToMaxPay,
  getOrgZeroClient,
  usdToLedgerDollars,
} from "@/lib/zero/sdk";

export { ACTION_CAPABILITIES, listDemoCapabilities };

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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

