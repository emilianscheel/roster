import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { agentMessages, agentSessions } from "@/lib/db/schema";
import { CodingAgentChat } from "@/components/coding-agent-chat";

export default async function SessionChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, orgId } = await requireSession();

  const [row] = await db
    .select()
    .from(agentSessions)
    .where(
      and(
        eq(agentSessions.id, id),
        eq(agentSessions.organizationId, orgId),
        eq(agentSessions.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!row) notFound();

  const messages = await db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.sessionId, id))
    .orderBy(asc(agentMessages.createdAt));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="text-lg font-semibold truncate">{row.title}</h1>
      <CodingAgentChat
        sessionId={id}
        initialMessages={messages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.content,
        }))}
      />
    </div>
  );
}
