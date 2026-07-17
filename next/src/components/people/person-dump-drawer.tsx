"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import type { PersonListItem } from "@/components/people/types";

type PersonDumpDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (people: PersonListItem[]) => void;
};

export function PersonDumpDrawer({
  open,
  onOpenChange,
  onCreated,
}: PersonDumpDrawerProps) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setText("");
      setSaving(false);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dump = text.trim();
    if (!dump || saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/people/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: dump }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to structure people");
      }

      const people = (data.people ?? []) as PersonListItem[];
      const count =
        typeof data.count === "number" ? data.count : people.length;
      onCreated?.(people);
      handleOpenChange(false);
      toast.success(
        count === 1 ? "Added 1 person" : `Added ${count} people`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to structure people",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} swipeDirection="right">
      <DrawerContent className="data-[swipe-direction=right]:[--drawer-content-width:min(100%,28rem)]">
        <form
          onSubmit={handleSubmit}
          className="flex h-full min-h-0 flex-1 flex-col"
        >
          <DrawerHeader>
            <DrawerTitle>Dump data</DrawerTitle>
            <DrawerDescription>
              Paste bios, LinkedIn text, links, or notes for one or more
              people. AI will structure and add them.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste anything about one or more people…"
              className="min-h-64 flex-1 resize-none"
              autoFocus
              disabled={saving}
            />
          </div>

          <DrawerFooter>
            <Button type="submit" disabled={saving || !text.trim()}>
              {saving ? (
                <>
                  <Loader2
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                  Structuring…
                </>
              ) : (
                "Structure & add"
              )}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
