"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonDrawer } from "@/components/people/person-drawer";
import {
  type PersonListItem,
  personInitials,
} from "@/components/people/types";
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
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setPeopleState(people);
  }, [people]);

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

  return (
    <div className="space-y-4">
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
          {people.length === 0 ? "No people yet" : "No matches"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((person) => {
            const active = person.id === selectedId;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => selectPerson(person.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/40",
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
              </button>
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
    </div>
  );
}
