import { rowsToCsv } from "@/lib/spend/export-csv";

export type ArenaCallExport = {
  id: string;
  roleId: string | null;
  candidateId: string | null;
  service: string;
  capability: string;
  purpose: string;
  quotedCents: number;
  actualCents: number;
  latencyMs: number;
  status: string;
  evidenceGained: number;
  createdAt: Date | string;
};

function createdAtIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

export function buildArenaActivityCsv(
  calls: ArenaCallExport[],
  options?: { includeRoleId?: boolean },
): string {
  const includeRoleId = options?.includeRoleId ?? true;
  const headers = [
    "id",
    ...(includeRoleId ? ["role_id"] : []),
    "candidate_id",
    "service",
    "capability",
    "purpose",
    "quoted",
    "actual",
    "latency_ms",
    "status",
    "evidence_gained",
    "created_at",
  ];

  return rowsToCsv(
    headers,
    calls.map((c) => [
      c.id,
      ...(includeRoleId ? [c.roleId] : []),
      c.candidateId,
      c.service,
      c.capability,
      c.purpose,
      c.quotedCents,
      c.actualCents,
      c.latencyMs,
      c.status,
      c.evidenceGained,
      createdAtIso(c.createdAt),
    ]),
  );
}

export function buildArenaByServiceCsv(calls: ArenaCallExport[]): string {
  const byService = new Map<
    string,
    { count: number; spend: number; success: number; failed: number }
  >();

  for (const call of calls) {
    const row = byService.get(call.service) ?? {
      count: 0,
      spend: 0,
      success: 0,
      failed: 0,
    };
    row.count += 1;
    row.spend += Number(call.actualCents);
    if (call.status === "success") row.success += 1;
    if (call.status === "failed") row.failed += 1;
    byService.set(call.service, row);
  }

  const rows = [...byService.entries()]
    .sort((a, b) => b[1].spend - a[1].spend)
    .map(([service, stats]) => [
      service,
      stats.count,
      stats.spend.toFixed(4),
      stats.success,
      stats.failed,
    ]);

  return rowsToCsv(
    ["service", "call_count", "total_spend", "success_count", "failed_count"],
    rows,
  );
}
