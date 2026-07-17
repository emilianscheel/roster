import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { roles, type Claim } from "@/lib/db/schema";
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

  const claims = (role.claims as Claim[]) || [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold">Brief</h1>
      <pre className="whitespace-pre-wrap rounded-lg border border-border p-4 text-sm">
        {role.brief}
      </pre>
      <div className="space-y-2">
        {claims.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-md border border-border px-3 py-2"
          >
            <span className="text-sm font-medium">{c.label}</span>
            <Badge variant="secondary">{c.priority}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
