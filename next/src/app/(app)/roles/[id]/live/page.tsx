import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { LiveRunPanel } from "@/components/live-run-panel";

export default async function LivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await requireSession();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role || role.organizationId !== orgId) notFound();

  const initialSteps =
    role.status === "draft"
      ? []
      : [
          "Compiled claims from brief",
          "Discovered Zero capabilities",
          "Built candidate pool",
          "Verified evidence",
          "Queued outreach for approval",
        ];

  return <LiveRunPanel roleId={id} initialSteps={initialSteps} />;
}
