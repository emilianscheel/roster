import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { roles, zeroCalls } from "@/lib/db/schema";

export default async function RoleSpendPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await requireSession();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role || role.organizationId !== orgId) notFound();

  const calls = await db
    .select()
    .from(zeroCalls)
    .where(eq(zeroCalls.roleId, id));

  const byService = new Map<string, number>();
  for (const c of calls) {
    byService.set(
      c.service,
      (byService.get(c.service) || 0) + Number(c.actualCents),
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Spend</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Spent"
          value={`$${(role.spentCents / 100).toFixed(2)}`}
        />
        <Metric
          label="Budget"
          value={`$${(role.budgetCents / 100).toFixed(2)}`}
        />
        <Metric
          label="Max / candidate"
          value={`$${(role.maxPerCandidateCents / 100).toFixed(2)}`}
        />
      </div>
      <div className="divide-y rounded-lg border border-border">
        {[...byService.entries()].map(([service, cents]) => (
          <div
            key={service}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span>{service}</span>
            <span className="tabular-nums">${cents.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
