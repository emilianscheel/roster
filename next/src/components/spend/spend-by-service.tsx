import { formatDollars } from "@/lib/spend/metrics";

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

  return (
    <div className="divide-y rounded-lg border border-border">
      {rows.map((row) => (
        <div
          key={row.service}
          className="flex items-center justify-between px-4 py-3 text-sm"
        >
          <span>
            {row.service}{" "}
            <span className="text-muted-foreground">· {row.count}</span>
          </span>
          <span className="tabular-nums">{formatDollars(row.spend, 3)}</span>
        </div>
      ))}
    </div>
  );
}
