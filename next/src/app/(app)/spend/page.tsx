import { eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { zeroCalls } from "@/lib/db/schema";

export default async function SpendPage() {
  const { orgId } = await requireSession();

  const [total] = await db
    .select({
      sum: sql<number>`coalesce(sum(${zeroCalls.actualCents}), 0)`,
      blocked: sql<number>`coalesce(sum(case when ${zeroCalls.status} = 'blocked' then 1 else 0 end), 0)::int`,
      calls: sql<number>`count(*)::int`,
    })
    .from(zeroCalls)
    .where(eq(zeroCalls.organizationId, orgId));

  const byService = await db
    .select({
      service: zeroCalls.service,
      spend: sql<number>`coalesce(sum(${zeroCalls.actualCents}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(zeroCalls)
    .where(eq(zeroCalls.organizationId, orgId))
    .groupBy(zeroCalls.service);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Spend</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Total" value={`$${Number(total?.sum || 0).toFixed(2)}`} />
        <Tile label="Calls" value={String(total?.calls || 0)} />
        <Tile label="Blocked" value={String(total?.blocked || 0)} />
      </div>
      <div className="divide-y rounded-lg border border-border">
        {byService.map((row) => (
          <div
            key={row.service}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span>
              {row.service}{" "}
              <span className="text-muted-foreground">· {row.count}</span>
            </span>
            <span className="tabular-nums">
              ${Number(row.spend).toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
