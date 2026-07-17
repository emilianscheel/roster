"use client";

import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { zeroCalls } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import {
  CALL_STATUS_META,
  formatRelativeTime,
  humanizeCapability,
  humanizeService,
  resolveServiceMeta,
} from "@/lib/zero/service-meta";

type ZeroCall = typeof zeroCalls.$inferSelect;

const STATUS_TABS = [
  { value: "all", label: "All", status: null as string | null },
  { value: "success", label: "Success", status: "success" },
  { value: "failed", label: "Failed", status: "failed" },
  { value: "blocked", label: "Blocked", status: "blocked" },
  { value: "skipped", label: "Skipped", status: "skipped" },
] as const;

export function ZeroCallsTable({ calls }: { calls: ZeroCall[] }) {
  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const status =
      STATUS_TABS.find((t) => t.value === statusTab)?.status ?? null;

    return calls.filter((c) => {
      if (status && c.status !== status) return false;
      if (!q) return true;
      const meta = resolveServiceMeta(c.service);
      const haystack = [
        c.service,
        c.capability,
        c.purpose,
        c.status,
        meta.displayName,
        humanizeService(c.service),
        humanizeCapability(c.capability),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [calls, query, statusTab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activity…"
            className="pl-8"
            aria-label="Search activity"
          />
        </div>
        <Tabs
          value={statusTab}
          onValueChange={setStatusTab}
          className="shrink-0"
        >
          <TabsList className="max-w-full overflow-x-auto">
            {STATUS_TABS.map((tab) => (
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
            {calls.length === 0 ? "No activity" : "No matches"}
          </div>
        ) : (
          filtered.map((call) => {
            const { displayName, Icon } = resolveServiceMeta(call.service);
            const status = CALL_STATUS_META[call.status] ?? CALL_STATUS_META.skipped;
            const StatusIcon = status.icon;
            const createdAt =
              call.createdAt instanceof Date
                ? call.createdAt
                : new Date(call.createdAt);

            return (
              <div
                key={call.id}
                className="flex items-start gap-3 px-4 py-3"
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="truncate font-medium">
                    {humanizeCapability(call.capability)}
                  </div>
                  <div className="flex min-w-0 items-center gap-2.5 truncate text-xs text-muted-foreground">
                    <span className="truncate">{displayName}</span>
                    <span className="text-border" aria-hidden>
                      ·
                    </span>
                    <span className="shrink-0">{formatRelativeTime(createdAt)}</span>
                    {call.latencyMs > 0 ? (
                      <>
                        <span className="text-border" aria-hidden>
                          ·
                        </span>
                        <span className="shrink-0">{call.latencyMs}ms</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn("gap-1 capitalize", status.className)}
                  >
                    <StatusIcon data-icon="inline-start" />
                    {status.label}
                  </Badge>
                  <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                    <span>${Number(call.actualCents).toFixed(3)}</span>
                    {call.evidenceGained > 0 ? (
                      <span className="inline-flex items-center gap-0.5">
                        <FileText className="size-3" />
                        {call.evidenceGained}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
