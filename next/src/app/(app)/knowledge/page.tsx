import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { knowledgeSnippets } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";

export default async function KnowledgePage() {
  const { orgId } = await requireSession();
  const snippets = await db
    .select()
    .from(knowledgeSnippets)
    .where(eq(knowledgeSnippets.organizationId, orgId))
    .orderBy(desc(knowledgeSnippets.createdAt));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Best Practices</h1>
      <div className="space-y-3">
        {snippets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No snippets yet</p>
        ) : (
          snippets.map((s) => (
            <article
              key={s.id}
              className="space-y-2 rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium">{s.title}</h2>
                {s.tool ? <Badge variant="secondary">{s.tool}</Badge> : null}
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                {s.markdown}
              </pre>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
