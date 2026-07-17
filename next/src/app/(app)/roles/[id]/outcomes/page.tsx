import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { candidates, roles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";

export default async function OutcomesPage({
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

  const late = list.filter((c) =>
    ["contacted", "replied", "interview", "rejected"].includes(c.stage),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Outcomes</h1>
      <div className="divide-y rounded-lg border border-border">
        {late.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No outcomes yet</div>
        ) : (
          late.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm font-medium">{c.name}</span>
              <Badge variant="secondary">{c.stage}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
