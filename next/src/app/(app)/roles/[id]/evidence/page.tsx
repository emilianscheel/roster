import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { candidates, evidence, roles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await requireSession();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role || role.organizationId !== orgId) notFound();

  const cands = await db
    .select()
    .from(candidates)
    .where(eq(candidates.roleId, id));

  const candIds = cands.map((c) => c.id);
  const rows =
    candIds.length === 0
      ? []
      : await db
          .select()
          .from(evidence)
          .where(inArray(evidence.candidateId, candIds));

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Evidence</h1>
      {cands.map((c) => {
        const items = rows.filter((e) => e.candidateId === c.id);
        return (
          <div key={c.id} className="space-y-2">
            <div className="font-medium">{c.name}</div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No evidence yet</p>
              ) : (
                items.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{e.claimLabel}</span>
                      <Badge variant="secondary">{e.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {(e.confidence * 100).toFixed(0)}% · $
                      {Number(e.costCents).toFixed(3)}
                      {e.newestEvidenceDays != null
                        ? ` · ${e.newestEvidenceDays}d`
                        : ""}
                    </div>
                    <ul className="list-inside list-disc text-xs text-muted-foreground">
                      {(e.sources || []).map((s, i) => (
                        <li key={i}>{s.title}</li>
                      ))}
                    </ul>
                    {e.contradicting ? (
                      <p className="text-xs text-destructive">{e.contradicting}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
