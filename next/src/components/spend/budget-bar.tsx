import { cn } from "@/lib/utils";
import { formatCentsAsDollars, utilizationPct } from "@/lib/spend/metrics";

export function BudgetBar({
  spentCents,
  budgetCents,
  className,
}: {
  spentCents: number;
  budgetCents: number;
  className?: string;
}) {
  const pct = utilizationPct(spentCents, budgetCents);
  const remaining = Math.max(0, budgetCents - spentCents);
  const over = spentCents > budgetCents;
  const barWidth = Math.min(100, pct);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="tabular-nums">
          <span className="font-semibold">
            {formatCentsAsDollars(spentCents)}
          </span>
          <span className="text-muted-foreground">
            {" "}
            of {formatCentsAsDollars(budgetCents)}
          </span>
        </span>
        <span
          className={cn(
            "tabular-nums text-xs",
            over ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {over
            ? `${pct}% used · over budget`
            : `${pct}% used · ${formatCentsAsDollars(remaining)} left`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            over
              ? "bg-destructive"
              : pct >= 80
                ? "bg-amber-500"
                : "bg-foreground/80",
          )}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}
