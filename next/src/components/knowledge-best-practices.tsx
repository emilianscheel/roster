"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type KnowledgeSnippet = {
  id: string;
  title: string;
  markdown: string;
  tool: string | null;
  tags: string[] | null;
};

type DrawerMode = "create" | "edit";

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function KnowledgeBestPractices({
  snippets,
}: {
  snippets: KnowledgeSnippet[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<DrawerMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [saving, setSaving] = useState(false);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter((s) => {
      const tags = (s.tags ?? []).join(" ").toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.markdown.toLowerCase().includes(q) ||
        (s.tool?.toLowerCase().includes(q) ?? false) ||
        tags.includes(q)
      );
    });
  }, [snippets, query]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setTitle("");
    setMarkdown("");
    setDrawerOpen(true);
  }

  function openEdit(snippet: KnowledgeSnippet) {
    setMode("edit");
    setEditingId(snippet.id);
    setTitle(snippet.title);
    setMarkdown(snippet.markdown);
    setDrawerOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextTitle = title.trim();
    const nextMarkdown = markdown.trim();
    if (!nextTitle || !nextMarkdown || saving) return;

    setSaving(true);
    try {
      const res =
        mode === "create"
          ? await fetch("/api/knowledge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: nextTitle,
                markdown: nextMarkdown,
              }),
            })
          : await fetch(`/api/knowledge/${editingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: nextTitle,
                markdown: nextMarkdown,
              }),
            });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      setDrawerOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(snippet: KnowledgeSnippet) {
    if (
      !window.confirm(`Delete “${snippet.title}”? This cannot be undone.`)
    ) {
      return;
    }
    setDeletingId(snippet.id);
    try {
      const res = await fetch(`/api/knowledge/${snippet.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRefine(snippet: KnowledgeSnippet) {
    setRefiningId(snippet.id);
    try {
      const res = await fetch(`/api/knowledge/${snippet.id}/refine`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to refine");
      }
      setMode("edit");
      setEditingId(snippet.id);
      setTitle(typeof data.title === "string" ? data.title : snippet.title);
      setMarkdown(
        typeof data.markdown === "string" ? data.markdown : snippet.markdown,
      );
      setDrawerOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refine");
    } finally {
      setRefiningId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Best Practices</h1>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Add best practice
        </Button>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search best practices…"
        aria-label="Search best practices"
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {snippets.length === 0
              ? "No snippets yet"
              : "No matching best practices"}
          </p>
        ) : (
          filtered.map((s) => {
            const busy = refiningId === s.id || deletingId === s.id;
            return (
              <article
                key={s.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-medium">{s.title}</h2>
                  {s.tool ? (
                    <Badge variant="secondary">{s.tool}</Badge>
                  ) : null}
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                  {s.markdown}
                </pre>
                <div className="flex justify-end gap-0.5 pt-1">
                  <IconAction
                    label="Edit"
                    disabled={busy}
                    onClick={() => openEdit(s)}
                  >
                    <Pencil />
                  </IconAction>
                  <IconAction
                    label="Refine with AI"
                    disabled={busy}
                    onClick={() => handleRefine(s)}
                  >
                    {refiningId === s.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Sparkles />
                    )}
                  </IconAction>
                  <IconAction
                    label="Delete"
                    disabled={busy}
                    onClick={() => handleDelete(s)}
                  >
                    {deletingId === s.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </IconAction>
                </div>
              </article>
            );
          })
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        swipeDirection="right"
      >
        <DrawerContent className="data-[swipe-direction=right]:[--drawer-content-width:min(100%,28rem)]">
          <form
            onSubmit={handleSubmit}
            className="flex h-full min-h-0 flex-1 flex-col"
          >
            <DrawerHeader>
              <DrawerTitle>
                {mode === "create" ? "Add best practice" : "Edit best practice"}
              </DrawerTitle>
              <DrawerDescription>
                {mode === "create"
                  ? "Capture a reusable recruiting practice for your org."
                  : "Update the title and body, then save."}
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              <div className="space-y-1.5">
                <label htmlFor="bp-title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="bp-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short title"
                  required
                  autoFocus
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col space-y-1.5">
                <label htmlFor="bp-markdown" className="text-sm font-medium">
                  Content
                </label>
                <Textarea
                  id="bp-markdown"
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="Markdown best practice…"
                  required
                  className="min-h-48 flex-1 resize-none"
                />
              </div>
            </div>

            <DrawerFooter>
              <Button
                type="submit"
                disabled={saving || !title.trim() || !markdown.trim()}
              >
                {saving ? (
                  <>
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                    Saving…
                  </>
                ) : mode === "create" ? (
                  "Add best practice"
                ) : (
                  "Save changes"
                )}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
