import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCentsAsDollars,
  formatDollars,
  type RoleSpendSummary,
} from "@/lib/spend/metrics";
import { cn } from "@/lib/utils";

export function RolesSpendTable({
  rows,
}: {
  rows: RoleSpendSummary[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No roles yet. Create a role to start tracking evidence spend.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Spent</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className="text-right">% used</TableHead>
            <TableHead className="text-right">Verified</TableHead>
            <TableHead className="text-right">Cost / verified</TableHead>
            <TableHead className="text-right">Saved by skip</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.roleId}>
              <TableCell>
                <Link
                  href={`/roles/${row.roleId}/spend`}
                  className="font-medium hover:underline"
                >
                  {row.title}
                </Link>
              </TableCell>
              <TableCell className="capitalize text-muted-foreground">
                {row.status}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCentsAsDollars(row.spentCents)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatCentsAsDollars(row.budgetCents)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  row.utilization >= 100
                    ? "text-destructive"
                    : row.utilization >= 80
                      ? "text-amber-600 dark:text-amber-400"
                      : "",
                )}
              >
                {row.utilization}%
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.verifiedCount}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.costPerVerified === null
                  ? "—"
                  : formatDollars(row.costPerVerified)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatDollars(row.savedBySkip)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
