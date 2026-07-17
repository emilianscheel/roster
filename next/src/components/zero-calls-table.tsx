import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { zeroCalls } from "@/lib/db/schema";

type ZeroCall = typeof zeroCalls.$inferSelect;

export function ZeroCallsTable({ calls }: { calls: ZeroCall[] }) {
  return (
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
          {calls.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                No calls
              </TableCell>
            </TableRow>
          ) : (
            calls.map((c) => (
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
  );
}
