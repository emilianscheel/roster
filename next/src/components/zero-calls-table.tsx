"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { zeroCalls } from "@/lib/db/schema";

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
      const haystack = [c.service, c.capability, c.status]
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
            placeholder="Search tools…"
            className="pl-8"
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

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Task</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Latency</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="text-right">Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No calls
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.service}</TableCell>
                  <TableCell>{c.capability}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    ${Number(c.actualCents).toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.latencyMs}ms
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.evidenceGained}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
