import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { people } from "@/lib/db/schema";

export default async function PeoplePage() {
  const { orgId } = await requireSession();
  const list = await db
    .select()
    .from(people)
    .where(eq(people.organizationId, orgId))
    .orderBy(desc(people.lastSeenAt));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">People</h1>
      <div className="divide-y rounded-lg border border-border">
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No people yet
          </div>
        ) : (
          list.map((p) => (
            <div key={p.id} className="px-4 py-3">
              <div className="font-medium">{p.name}</div>
              {p.headline ? (
                <div className="text-xs text-muted-foreground">{p.headline}</div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
