import { cn } from "@/lib/utils";

export type KpiItem = {
  label: string;
  value: string;
  helper?: string;
};

export function KpiStrip({
  items,
  className,
}: {
  items: KpiItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        items.length <= 3
          ? "sm:grid-cols-3"
          : items.length === 4
            ? "sm:grid-cols-2 lg:grid-cols-4"
            : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border p-4"
        >
          <div className="text-2xl font-semibold tabular-nums tracking-tight">
            {item.value}
          </div>
          <div className="text-xs text-muted-foreground">{item.label}</div>
          {item.helper ? (
            <div className="mt-1 text-[11px] text-muted-foreground/80">
              {item.helper}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
