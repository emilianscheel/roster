"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { PersonDrawer } from "@/components/people/person-drawer";
import {
  type PersonListItem,
  personInitials,
} from "@/components/people/types";
import { cn } from "@/lib/utils";

type PeopleGridProps = {
  people: PersonListItem[];
};

export function PeopleGrid({ people }: PeopleGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("person");

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => {
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
  }, [people, deferredQuery]);

  const selected = useMemo(
    () => people.find((p) => p.id === selectedId) ?? null,
    [people, selectedId],
  );

  function selectPerson(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("person", id);
    else params.delete("person");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          className="pl-8"
          aria-label="Search people"
        />
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
      />
    </div>
  );
}
