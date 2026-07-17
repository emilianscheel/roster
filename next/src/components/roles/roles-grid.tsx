"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ListChecks, Search, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RoleListItem } from "@/components/roles/types";

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sourcing", label: "Sourcing" },
  { value: "review", label: "Review" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
] as const;

type FilterTab = (typeof FILTER_TABS)[number]["value"];

type RolesGridProps = {
  roles: RoleListItem[];
};

function formatSpend(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function spendLabel(role: RoleListItem): string {
  const spent = formatSpend(role.spentCents);
  if (role.budgetCents <= 0) return `${spent} spent`;
  const pct = Math.round((role.spentCents / role.budgetCents) * 100);
  return `${spent} · ${pct}%`;
}

export function RolesGrid({ roles }: RolesGridProps) {
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return roles.filter((role) => {
      if (filterTab !== "all" && role.status !== filterTab) return false;
      if (!q) return true;
      const haystack = [role.title, role.location, role.seniority, role.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [roles, deferredQuery, filterTab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles…"
            className="pl-8"
            aria-label="Search roles"
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

      <div className="divide-y rounded-lg border border-border">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {roles.length === 0 ? "No roles" : "No matches"}
          </div>
        ) : (
          filtered.map((role) => (
            <Link
              key={role.id}
              href={`/roles/${role.id}/live`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="truncate font-medium">{role.title}</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="gap-1">
                    <Users data-icon="inline-start" />
                    {role.candidateCount}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <ListChecks data-icon="inline-start" />
                    {role.requirementCount}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Wallet data-icon="inline-start" />
                    {spendLabel(role)}
                  </Badge>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 capitalize">
                {role.status}
              </Badge>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
