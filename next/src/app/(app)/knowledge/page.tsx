import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { knowledgeSnippets } from "@/lib/db/schema";
import { KnowledgeBestPractices } from "@/components/knowledge-best-practices";

export default async function KnowledgePage() {
  const { orgId } = await requireSession();
  const snippets = await db
    .select({
      id: knowledgeSnippets.id,
      title: knowledgeSnippets.title,
      markdown: knowledgeSnippets.markdown,
      tool: knowledgeSnippets.tool,
      tags: knowledgeSnippets.tags,
    })
    .from(knowledgeSnippets)
    .where(eq(knowledgeSnippets.organizationId, orgId))
    .orderBy(desc(knowledgeSnippets.createdAt));

  return <KnowledgeBestPractices snippets={snippets} />;
}
