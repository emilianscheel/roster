import { formatDollars } from "@/lib/spend/metrics";
import { resolveServiceMeta } from "@/lib/zero/service-meta";

export type ServiceSpendRow = {
  service: string;
  spend: number;
  count: number;
};

export function SpendByService({
  rows,
  emptyLabel = "No Zero calls yet",
}: {
  rows: ServiceSpendRow[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const maxSpend = Math.max(...rows.map((row) => row.spend), 0);

  return (
    <div className="divide-y rounded-lg border border-border">
      {rows.map((row) => {
        const { displayName, categoryLabel, Icon } = resolveServiceMeta(
          row.service,
        );
        const barWidth =
          maxSpend > 0 ? Math.max((row.spend / maxSpend) * 100, 2) : 0;

        return (
          <div key={row.service} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {displayName}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {row.count} {row.count === 1 ? "call" : "calls"}
                    {categoryLabel ? (
                      <>
                        <span className="text-border" aria-hidden>
                          {" "}
                          ·{" "}
                        </span>
                        {categoryLabel}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <span className="shrink-0 text-sm tabular-nums">
                {formatDollars(row.spend, 3)}
              </span>
            </div>
            <div className="mt-2 ml-12 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground/25"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
