import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { candidates, roles } from "@/lib/db/schema";

const STAGES = [
  "discovered",
  "researching",
  "verified",
  "approved",
  "contacted",
  "replied",
  "interview",
] as const;

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await requireSession();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role || role.organizationId !== orgId) notFound();

  const list = await db
    .select()
    .from(candidates)
    .where(eq(candidates.roleId, id));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Pipeline</h1>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const items = list.filter((c) => c.stage === stage);
          return (
            <div
              key={stage}
              className="w-56 shrink-0 space-y-2 rounded-lg border border-border p-2"
            >
              <div className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stage} · {items.length}
              </div>
              {items.map((c) => (
                <div
                  key={c.id}
                  className="space-y-1 rounded-md bg-muted/40 p-2"
                >
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {(c.matchScore * 100).toFixed(0)}% · $
                    {(c.verificationSpendCents / 100).toFixed(2)}
                  </div>
                  {c.strongestSignal ? (
                    <div className="line-clamp-2 text-xs text-muted-foreground">
                      {c.strongestSignal}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
