import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { candidates, roles } from "@/lib/db/schema";

export default async function OutreachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await requireSession();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role || role.organizationId !== orgId) notFound();

  const drafts = await db
    .select()
    .from(candidates)
    .where(eq(candidates.roleId, id));

  const withDraft = drafts.filter((c) => c.outreachDraft);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Outreach</h1>
      {withDraft.length === 0 ? (
        <p className="text-sm text-muted-foreground">No drafts</p>
      ) : (
        withDraft.map((c) => (
          <div key={c.id} className="space-y-2 rounded-lg border border-border p-4">
            <div className="font-medium">{c.name}</div>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
              {c.outreachDraft}
            </pre>
            <div className="text-xs text-muted-foreground">{c.currentAction}</div>
          </div>
        ))
      )}
    </div>
  );
}
