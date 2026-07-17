import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { TakeActionChat } from "@/components/take-action/take-action-chat";

export default async function TakeActionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await requireSession();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role || role.organizationId !== orgId) notFound();

  const initialMessages = (role.chatMessages ?? []) as unknown as UIMessage[];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <TakeActionChat
        roleId={id}
        brief={role.brief}
        initialMessages={initialMessages}
      />
    </div>
  );
}
