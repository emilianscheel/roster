"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  Ban,
  Check,
  FileText,
  GitBranch,
  Mail,
  Radar,
  Search,
  SkipForward,
  Sparkles,
  UserSearch,
  X,
  type LucideProps,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { zeroCalls } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type ZeroCall = typeof zeroCalls.$inferSelect;
type IconComponent = ComponentType<LucideProps>;

const STATUS_TABS = [
  { value: "all", label: "All", status: null as string | null },
  { value: "success", label: "Success", status: "success" },
  { value: "failed", label: "Failed", status: "failed" },
  { value: "blocked", label: "Blocked", status: "blocked" },
  { value: "skipped", label: "Skipped", status: "skipped" },
] as const;

const SERVICE_ICONS: Record<string, IconComponent> = {
  "profile-scraper": UserSearch,
  "person-enrichment": UserSearch,
  "targeted-search": Search,
  "github-signals": GitBranch,
  "contact-enrichment": Radar,
  "outreach-mail": Mail,
  zero: Sparkles,
};

const STATUS_META: Record<
  string,
  { label: string; icon: IconComponent; className: string }
> = {
  success: {
    label: "Success",
    icon: Check,
    className: "text-emerald-700 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    icon: X,
    className: "text-destructive",
  },
  blocked: {
    label: "Blocked",
    icon: Ban,
    className: "text-amber-700 dark:text-amber-400",
  },
  skipped: {
    label: "Skipped",
    icon: SkipForward,
    className: "text-muted-foreground",
  },
};

function humanizeService(service: string): string {
  return service
    .split(/[-_./]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function humanizeCapability(capability: string): string {
  const parts = capability.split(/[._]/).filter(Boolean);
  if (parts.length === 0) return capability;
  return parts
    .map((part, i) =>
      i === 0
        ? part.charAt(0).toUpperCase() + part.slice(1)
        : part.toLowerCase(),
    )
    .join(" ");
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (abs < 60) return rtf.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return rtf.format(months, "month");
  return rtf.format(Math.round(months / 12), "year");
}

function serviceIcon(service: string): IconComponent {
  return SERVICE_ICONS[service] ?? Sparkles;
}

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
      const haystack = [
        c.service,
        c.capability,
        c.purpose,
        c.status,
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
            const Icon = serviceIcon(call.service);
            const status = STATUS_META[call.status] ?? STATUS_META.skipped;
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
                  <div className="truncate text-xs text-muted-foreground">
                    {humanizeService(call.service)}
                    <span className="mx-1.5 text-border">·</span>
                    {formatRelativeTime(createdAt)}
                    {call.latencyMs > 0 ? (
                      <>
                        <span className="mx-1.5 text-border">·</span>
                        {call.latencyMs}ms
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
