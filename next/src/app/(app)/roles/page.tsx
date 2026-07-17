import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";

export default async function RolesPage() {
  const { orgId } = await requireSession();
  const list = await db
    .select()
    .from(roles)
    .where(eq(roles.organizationId, orgId))
    .orderBy(desc(roles.createdAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Roles</h1>
        <Link
          href="/new"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          + New
        </Link>
      </div>
      <div className="divide-y rounded-lg border border-border">
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No roles
          </div>
        ) : (
          list.map((role) => (
            <Link
              key={role.id}
              href={`/roles/${role.id}/live`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{role.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  ${(role.spentCents / 100).toFixed(2)} spent
                </div>
              </div>
              <Badge variant="secondary">{role.status}</Badge>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
