import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { candidates, roles, zeroCalls } from "@/lib/db/schema";
import { BudgetBar } from "@/components/spend/budget-bar";
import { ExportMenu } from "@/components/spend/export-menu";
import { KpiStrip } from "@/components/spend/kpi-strip";
import { RolesSpendTable } from "@/components/spend/roles-spend-table";
import { SpendByService } from "@/components/spend/spend-by-service";
import { rowsToCsv } from "@/lib/spend/export-csv";
import {
  buildRoleSpendSummaries,
  centsToDollars,
  efficiencyRanking,
  formatCostPer,
  formatDollars,
  funnelCosts,
  summarizeCalls,
  type LedgerCall,
  type PipelineStage,
} from "@/lib/spend/metrics";

export default async function SpendPage() {
  const { orgId } = await requireSession();

  const [roleRows, callRows] = await Promise.all([
    db.select().from(roles).where(eq(roles.organizationId, orgId)),
    db.select().from(zeroCalls).where(eq(zeroCalls.organizationId, orgId)),
  ]);

  const roleIds = roleRows.map((r) => r.id);
  const candRows =
    roleIds.length === 0
      ? []
      : await db
          .select({
            roleId: candidates.roleId,
            stage: candidates.stage,
          })
          .from(candidates)
          .where(inArray(candidates.roleId, roleIds));

  const calls: LedgerCall[] = callRows.map((c) => ({
    id: c.id,
    roleId: c.roleId,
    candidateId: c.candidateId,
    service: c.service,
    capability: c.capability,
    purpose: c.purpose,
    quotedCents: Number(c.quotedCents),
    actualCents: Number(c.actualCents),
    status: c.status,
    evidenceGained: c.evidenceGained,
    createdAt: c.createdAt,
  }));

  const stagesByRole = new Map<string, PipelineStage[]>();
  for (const c of candRows) {
    const list = stagesByRole.get(c.roleId) ?? [];
    list.push(c.stage as PipelineStage);
    stagesByRole.set(c.roleId, list);
  }

  const ledgerStats = summarizeCalls(calls);
  // Prefer role spentCents rollups for portfolio burn when available.
  const spentFromRoles = roleRows.reduce((s, r) => s + r.spentCents, 0);
  const totalSpendDollars =
    spentFromRoles > 0
      ? centsToDollars(spentFromRoles)
      : ledgerStats.totalSpend;

  const allStages = candRows.map((c) => c.stage as PipelineStage);
  const funnel = funnelCosts(totalSpendDollars, allStages);

  const budgetCommitted = roleRows.reduce((s, r) => s + r.budgetCents, 0);
  const budgetRemaining = Math.max(0, budgetCommitted - spentFromRoles);

  const roleSummaries = buildRoleSpendSummaries(
    roleRows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      budgetCents: r.budgetCents,
      spentCents: r.spentCents,
      maxPerCandidateCents: r.maxPerCandidateCents,
      maxToolCallCents: r.maxToolCallCents,
    })),
    calls,
    stagesByRole,
  );

  const ranking = efficiencyRanking(roleSummaries);

  const byRoleCsv = rowsToCsv(
    [
      "role",
      "status",
      "spent",
      "budget",
      "utilization_pct",
      "verified",
      "cost_per_verified",
      "saved_by_skip",
    ],
    roleSummaries.map((r) => [
      r.title,
      r.status,
      centsToDollars(r.spentCents).toFixed(2),
      centsToDollars(r.budgetCents).toFixed(2),
      r.utilization,
      r.verifiedCount,
      r.costPerVerified === null ? "" : r.costPerVerified.toFixed(4),
      r.savedBySkip.toFixed(4),
    ]),
  );

  const ledgerCsv = rowsToCsv(
    [
      "id",
      "role_id",
      "candidate_id",
      "service",
      "capability",
      "purpose",
      "quoted",
      "actual",
      "status",
      "evidence_gained",
      "created_at",
    ],
    calls.map((c) => [
      c.id,
      c.roleId,
      c.candidateId,
      c.service,
      c.capability,
      c.purpose,
      c.quotedCents,
      c.actualCents,
      c.status,
      c.evidenceGained,
      typeof c.createdAt === "string"
        ? c.createdAt
        : c.createdAt.toISOString(),
    ]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Spend</h1>
          <p className="text-sm text-muted-foreground">
            Evidence procurement across roles — burn, efficiency, and what we
            wisely skipped.
          </p>
        </div>
        <ExportMenu
          options={[
            {
              label: "Spend by role (.csv)",
              filename: "spend-by-role.csv",
              csv: byRoleCsv,
            },
            {
              label: "Full ledger (.csv)",
              filename: "spend-ledger.csv",
              csv: ledgerCsv,
            },
          ]}
        />
      </div>

      <BudgetBar spentCents={spentFromRoles} budgetCents={budgetCommitted} />

      <KpiStrip
        items={[
          {
            label: "Total spend",
            value: formatDollars(totalSpendDollars),
            helper: `${ledgerStats.callCount} Zero calls`,
          },
          {
            label: "Budget remaining",
            value: formatDollars(centsToDollars(budgetRemaining)),
            helper: `${formatDollars(centsToDollars(budgetCommitted))} committed`,
          },
          {
            label: "Cost / verified",
            value: formatCostPer(totalSpendDollars, funnel.verifiedCount),
            helper: `${funnel.verifiedCount} verified+`,
          },
          {
            label: "Cost / interview",
            value: formatCostPer(totalSpendDollars, funnel.interviewCount),
            helper: `${funnel.interviewCount} interviews`,
          },
          {
            label: "Saved by skip",
            value: formatDollars(ledgerStats.savedBySkip),
            helper: `${ledgerStats.skippedCount} skipped calls`,
          },
          {
            label: "Failed waste",
            value: formatDollars(ledgerStats.failedWaste),
            helper:
              ledgerStats.blockedCount > 0
                ? `${ledgerStats.blockedCount} blocked pending`
                : `${ledgerStats.failedCount} failed`,
          },
        ]}
      />

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">Spend by role</h2>
          <span className="text-xs text-muted-foreground">
            Cost / approved {formatCostPer(totalSpendDollars, funnel.approvedCount)}
            {" · "}
            Cost / contacted{" "}
            {formatCostPer(totalSpendDollars, funnel.contactedCount)}
          </span>
        </div>
        <RolesSpendTable rows={roleSummaries} />
      </section>

      {(ranking.best.length > 0 || ranking.worst.length > 0) && (
        <section className="grid gap-3 sm:grid-cols-2">
          <EfficiencyCard
            title="Most efficient"
            subtitle="Lowest cost per verified"
            rows={ranking.best}
          />
          <EfficiencyCard
            title="Needs attention"
            subtitle="Highest cost per verified"
            rows={ranking.worst}
          />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Spend by service</h2>
        <SpendByService
          rows={ledgerStats.byService}
          emptyLabel="No Zero calls yet. Start sourcing on a role to buy evidence."
        />
      </section>
    </div>
  );
}

function EfficiencyCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: ReturnType<typeof efficiencyRanking>["best"];
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mb-3 text-xs text-muted-foreground">{subtitle}</div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Need at least one verified candidate.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.roleId}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <Link
                href={`/roles/${r.roleId}/spend`}
                className="truncate hover:underline"
              >
                {r.title}
              </Link>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {r.costPerVerified === null
                  ? "—"
                  : formatDollars(r.costPerVerified)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
