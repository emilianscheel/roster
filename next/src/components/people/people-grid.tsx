"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PersonDrawer } from "@/components/people/person-drawer";
import { PersonDumpDrawer } from "@/components/people/person-dump-drawer";
import { PersonFormDrawer } from "@/components/people/person-form-drawer";
import {
  type PersonListItem,
  personInitials,
} from "@/components/people/types";
import type { PersonPayload } from "@/lib/people/person-payload";
import { cn } from "@/lib/utils";

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "with_email", label: "With email" },
  { value: "with_links", label: "With links" },
  { value: "needs_enrichment", label: "Needs enrichment" },
] as const;

type FilterTab = (typeof FILTER_TABS)[number]["value"];

type PeopleGridProps = {
  people: PersonListItem[];
};

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
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

function matchesFilter(person: PersonListItem, tab: FilterTab): boolean {
  const hasLinks = Object.keys(person.links ?? {}).length > 0;
  switch (tab) {
    case "with_email":
      return Boolean(person.email?.trim());
    case "with_links":
      return hasLinks;
    case "needs_enrichment":
      return (
        !person.email?.trim() ||
        !hasLinks ||
        person.experiences.length === 0
      );
    default:
      return true;
  }
}

export function PeopleGrid({ people }: PeopleGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("person");

  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [peopleState, setPeopleState] = useState(people);
  const [prevPeople, setPrevPeople] = useState(people);
  const deferredQuery = useDeferredValue(query);

  if (people !== prevPeople) {
    setPrevPeople(people);
    setPeopleState(people);
  }

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingPerson, setEditingPerson] = useState<PersonListItem | null>(
    null,
  );
  const [refinePayload, setRefinePayload] = useState<PersonPayload | null>(
    null,
  );
  const [dumpOpen, setDumpOpen] = useState(false);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openForm() {
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return peopleState.filter((p) => {
      if (!matchesFilter(p, filterTab)) return false;
      if (!q) return true;
      const haystack = [
        p.name,
        p.headline,
        p.location,
        p.email,
        ...Object.values(p.links ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [peopleState, deferredQuery, filterTab]);

  const selected = useMemo(
    () => peopleState.find((p) => p.id === selectedId) ?? null,
    [peopleState, selectedId],
  );

  function selectPerson(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("person", id);
    else params.delete("person");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handlePersonUpdated(updated: PersonListItem) {
    setPeopleState((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  }

  function openStructuredCreate() {
    setFormMode("create");
    setEditingPerson(null);
    setRefinePayload(null);
    openForm();
  }

  function openEdit(person: PersonListItem) {
    setFormMode("edit");
    setEditingPerson(person);
    setRefinePayload(null);
    openForm();
  }

  async function handleDelete(person: PersonListItem) {
    if (
      !window.confirm(`Delete “${person.name}”? This cannot be undone.`)
    ) {
      return;
    }
    setDeletingId(person.id);
    try {
      const res = await fetch(`/api/people/${person.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete");
      }
      setPeopleState((prev) => prev.filter((p) => p.id !== person.id));
      if (selectedId === person.id) selectPerson(null);
      router.refresh();
      toast.success("Person deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRefine(person: PersonListItem) {
    setRefiningId(person.id);
    try {
      const res = await fetch(`/api/people/${person.id}/refine`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to refine");
      }
      setFormMode("edit");
      setEditingPerson(person);
      setRefinePayload(data.person as PersonPayload);
      openForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refine");
    } finally {
      setRefiningId(null);
    }
  }

  function handleFormSaved(person: PersonListItem) {
    setPeopleState((prev) => {
      const exists = prev.some((p) => p.id === person.id);
      if (exists) {
        return prev.map((p) => (p.id === person.id ? person : p));
      }
      return [person, ...prev];
    });
    router.refresh();
  }

  function handleDumpCreated(created: PersonListItem[]) {
    setPeopleState((prev) => [...created, ...prev]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">People</h1>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" size="sm" className="gap-1" />
            }
          >
            <Plus data-icon="inline-start" />
            Add Person
            <ChevronDown className="size-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={openStructuredCreate}>
              Structured Data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDumpOpen(true)}>
              Dump Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            className="pl-8"
            aria-label="Search people"
          />
        </div>
        <Tabs
          value={filterTab}
          onValueChange={(value) => setFilterTab(value as FilterTab)}
          className="shrink-0"
        >
          <TabsList className="max-w-full overflow-x-auto">
            {FILTER_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          {peopleState.length === 0 ? "No people yet" : "No matches"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((person) => {
            const active = person.id === selectedId;
            const busy =
              refiningId === person.id || deletingId === person.id;
            return (
              <div
                key={person.id}
                role="button"
                tabIndex={0}
                onClick={() => selectPerson(person.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectPerson(person.id);
                  }
                }}
                className={cn(
                  "relative flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/40",
                  active && "border-ring bg-accent/30 ring-1 ring-ring/40",
                )}
              >
                <Avatar size="lg" className="mt-0.5">
                  {person.imageUrl ? (
                    <AvatarImage src={person.imageUrl} alt={person.name} />
                  ) : null}
                  <AvatarFallback>{personInitials(person.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{person.name}</div>
                  {person.headline ? (
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {person.headline}
                    </div>
                  ) : null}
                  {person.location ? (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{person.location}</span>
                    </div>
                  ) : null}
                </div>

                <div
                  className="absolute right-2 bottom-2 flex gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <IconAction
                    label="Edit"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(person);
                    }}
                  >
                    <Pencil />
                  </IconAction>
                  <IconAction
                    label="Refine with AI"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleRefine(person);
                    }}
                  >
                    {refiningId === person.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Sparkles />
                    )}
                  </IconAction>
                  <IconAction
                    label="Delete"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(person);
                    }}
                  >
                    {deletingId === person.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </IconAction>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PersonDrawer
        person={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) selectPerson(null);
        }}
        onPersonUpdated={handlePersonUpdated}
      />

      <PersonFormDrawer
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        person={editingPerson}
        personId={editingPerson?.id}
        initialPayload={refinePayload}
        onSaved={handleFormSaved}
      />

      <PersonDumpDrawer
        open={dumpOpen}
        onOpenChange={setDumpOpen}
        onCreated={handleDumpCreated}
      />
    </div>
  );
}
