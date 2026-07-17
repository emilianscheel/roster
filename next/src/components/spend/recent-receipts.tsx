import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/spend/metrics";
import { cn } from "@/lib/utils";
import {
  CALL_STATUS_META,
  formatRelativeTime,
  humanizeCapability,
  resolveServiceMeta,
} from "@/lib/zero/service-meta";

export type ReceiptRow = {
  id: string;
  service: string;
  capability: string;
  status: string;
  actualCents: number;
  createdAt: Date | string;
};

export function RecentReceipts({
  receipts,
  emptyLabel = "Receipts appear here after Zero calls run.",
}: {
  receipts: ReceiptRow[];
  emptyLabel?: string;
}) {
  if (receipts.length === 0) {
    return (
      <div className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border border-border">
      {receipts.map((receipt) => {
        const { displayName, Icon } = resolveServiceMeta(receipt.service);
        const status = CALL_STATUS_META[receipt.status] ?? CALL_STATUS_META.skipped;
        const StatusIcon = status.icon;
        const createdAt =
          receipt.createdAt instanceof Date
            ? receipt.createdAt
            : new Date(receipt.createdAt);

        return (
          <div
            key={receipt.id}
            className="flex items-start gap-3 px-4 py-3"
          >
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="truncate text-sm font-medium">
                {humanizeCapability(receipt.capability)}
              </div>
              <div className="flex min-w-0 items-center gap-2.5 truncate text-xs text-muted-foreground">
                <span className="truncate">{displayName}</span>
                <span className="text-border" aria-hidden>
                  ·
                </span>
                <span className="shrink-0">{formatRelativeTime(createdAt)}</span>
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
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatDollars(Number(receipt.actualCents), 3)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
