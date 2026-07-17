import { and, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { candidates, evidence, roles, zeroCalls } from "@/lib/db/schema";
import { BudgetBar } from "@/components/spend/budget-bar";
import { BudgetSettings } from "@/components/spend/budget-settings";
import { CandidatesSpendTable } from "@/components/spend/candidates-spend-table";
import { ExportMenu } from "@/components/spend/export-menu";
import { KpiStrip } from "@/components/spend/kpi-strip";
import { RecentReceipts } from "@/components/spend/recent-receipts";
import { SpendByService } from "@/components/spend/spend-by-service";
import { rowsToCsv } from "@/lib/spend/export-csv";
import {
    avgSpendPerCandidate,
    buildCandidateSpendSummaries,
    centsToDollars,
    formatCentsAsDollars,
    formatCostPer,
    formatDollars,
    funnelCosts,
    summarizeCalls,
    type LedgerCall,
    type PipelineStage,
} from "@/lib/spend/metrics";

export default async function RoleSpendPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { orgId } = await requireSession();

    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!role || role.organizationId !== orgId) notFound();

    const [callRows, candRows] = await Promise.all([
        db
            .select()
            .from(zeroCalls)
            .where(and(eq(zeroCalls.organizationId, orgId), eq(zeroCalls.roleId, id))),
        db.select().from(candidates).where(eq(candidates.roleId, id)),
    ]);

    const candIds = candRows.map((c) => c.id);
    const evidenceCounts =
        candIds.length === 0
            ? []
            : await db
                  .select({
                      candidateId: evidence.candidateId,
                      count: sql<number>`count(*)::int`,
                  })
                  .from(evidence)
                  .where(inArray(evidence.candidateId, candIds))
                  .groupBy(evidence.candidateId);

    const evidenceByCand = new Map(evidenceCounts.map((e) => [e.candidateId, e.count]));

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

    const ledgerStats = summarizeCalls(calls);
    const totalSpendDollars = centsToDollars(role.spentCents);
    const stages = candRows.map((c) => c.stage as PipelineStage);
    const funnel = funnelCosts(totalSpendDollars, stages);
    const avgPerCand = avgSpendPerCandidate(
        candRows.map((c) => ({
            id: c.id,
            name: c.name,
            stage: c.stage as PipelineStage,
            verificationSpendCents: c.verificationSpendCents,
        })),
    );

    const candidateSummaries = buildCandidateSpendSummaries(
        candRows.map((c) => ({
            id: c.id,
            name: c.name,
            stage: c.stage as PipelineStage,
            verificationSpendCents: c.verificationSpendCents,
            evidenceCount: evidenceByCand.get(c.id) ?? 0,
        })),
    );

    const recentReceipts = [...callRows]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);

    const candidatesCsv = rowsToCsv(
        ["candidate", "stage", "evidence_count", "verification_spend"],
        candidateSummaries.map((c) => [
            c.name,
            c.stage,
            c.evidenceCount,
            c.spendDollars.toFixed(2),
        ]),
    );

    const ledgerCsv = rowsToCsv(
        [
            "id",
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
            c.candidateId,
            c.service,
            c.capability,
            c.purpose,
            c.quotedCents,
            c.actualCents,
            c.status,
            c.evidenceGained,
            typeof c.createdAt === "string" ? c.createdAt : c.createdAt.toISOString(),
        ]),
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold">Spend</h1>
                </div>
                <ExportMenu
                    options={[
                        {
                            label: "Candidates spend (.csv)",
                            filename: "candidates-spend.csv",
                            csv: candidatesCsv,
                        },
                        {
                            label: "Role ledger (.csv)",
                            filename: "role-ledger.csv",
                            csv: ledgerCsv,
                        },
                    ]}
                />
            </div>

            <BudgetBar spentCents={role.spentCents} budgetCents={role.budgetCents} />

            <KpiStrip
                items={[
                    {
                        label: "Spent",
                        value: formatCentsAsDollars(role.spentCents),
                        helper: `${ledgerStats.callCount} calls`,
                    },
                    {
                        label: "Remaining",
                        value: formatCentsAsDollars(
                            Math.max(0, role.budgetCents - role.spentCents),
                        ),
                        helper: `of ${formatCentsAsDollars(role.budgetCents)}`,
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
                        label: "Avg / candidate",
                        value: formatDollars(avgPerCand),
                        helper: `max ${formatCentsAsDollars(role.maxPerCandidateCents)}`,
                    },
                    {
                        label: "Saved by skip",
                        value: formatDollars(ledgerStats.savedBySkip),
                        helper:
                            ledgerStats.failedWaste > 0
                                ? `${formatDollars(ledgerStats.failedWaste)} failed waste`
                                : `${ledgerStats.skippedCount} skipped`,
                    },
                ]}
            />

            <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                <div>
                    Cost / approved{" "}
                    <span className="tabular-nums text-foreground">
                        {formatCostPer(totalSpendDollars, funnel.approvedCount)}
                    </span>
                </div>
                <div>
                    Cost / contacted{" "}
                    <span className="tabular-nums text-foreground">
                        {formatCostPer(totalSpendDollars, funnel.contactedCount)}
                    </span>
                </div>
                <div>
                    Blocked pending{" "}
                    <span className="tabular-nums text-foreground">{ledgerStats.blockedCount}</span>
                </div>
            </div>

            <BudgetSettings
                roleId={role.id}
                budgetCents={role.budgetCents}
                maxPerCandidateCents={role.maxPerCandidateCents}
                maxToolCallCents={role.maxToolCallCents}
            />

            <section className="space-y-2">
                <h2 className="text-sm font-medium">Spend by candidate</h2>
                <CandidatesSpendTable roleId={role.id} rows={candidateSummaries} />
            </section>

            <section className="space-y-2">
                <h2 className="text-sm font-medium">Spend by service</h2>
                <SpendByService
                    rows={ledgerStats.byService}
                    emptyLabel="No Zero calls for this role yet."
                />
            </section>

            <section className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-medium">Recent receipts</h2>
                    <Link
                        href={`/roles/${role.id}/arena`}
                        className="text-xs text-muted-foreground hover:underline"
                    >
                        Open Arena
                    </Link>
                </div>
                <RecentReceipts receipts={recentReceipts} />
            </section>
        </div>
    );
}
