import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { rolePerspectives, roleRequirements, roles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";

export default async function BriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await requireSession();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role || role.organizationId !== orgId) notFound();

  const requirements = await db
    .select()
    .from(roleRequirements)
    .where(eq(roleRequirements.roleId, id))
    .orderBy(asc(roleRequirements.sortOrder));

  const perspectives = await db
    .select()
    .from(rolePerspectives)
    .where(eq(rolePerspectives.roleId, id));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">Brief</h1>
        <pre className="whitespace-pre-wrap rounded-lg border border-border p-4 text-sm">
          {role.brief}
        </pre>
        {(role.seniority || role.location || role.employmentType) && (
          <div className="flex flex-wrap gap-2">
            {role.seniority ? (
              <Badge variant="secondary">{role.seniority}</Badge>
            ) : null}
            {role.location ? (
              <Badge variant="secondary">{role.location}</Badge>
            ) : null}
            {role.employmentType ? (
              <Badge variant="secondary">{role.employmentType}</Badge>
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Requirements</h2>
        {requirements.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet</p>
        ) : (
          requirements.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <span className="text-sm font-medium">{r.label}</span>
              <Badge variant="secondary">{r.priority}</Badge>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Perspectives</h2>
        {perspectives.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet</p>
        ) : (
          perspectives.map((p) => (
            <div
              key={p.id}
              className="space-y-1 rounded-md border border-border px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{p.title}</span>
                <Badge variant="secondary">{p.kind}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
