import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { agentSessions } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function SessionsPage() {
  const { session, orgId } = await requireSession();

  const list = await db
    .select()
    .from(agentSessions)
    .where(
      and(
        eq(agentSessions.organizationId, orgId),
        eq(agentSessions.userId, session.user.id),
        eq(agentSessions.kind, "coding"),
      ),
    )
    .orderBy(desc(agentSessions.updatedAt));

  async function createSession() {
    "use server";
    const { session: s, orgId: o } = await requireSession();
    const id = crypto.randomUUID();
    await db.insert(agentSessions).values({
      id,
      organizationId: o,
      userId: s.user.id,
      kind: "coding",
      title: "New session",
    });
    redirect(`/sessions/${id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Sessions</h1>
        <form action={createSession}>
          <Button type="submit" size="sm" className="gap-1">
            <Plus className="size-3.5" />
            New
          </Button>
        </form>
      </div>
      <div className="divide-y rounded-lg border border-border">
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No sessions
          </div>
        ) : (
          list.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {s.updatedAt.toLocaleString()}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
