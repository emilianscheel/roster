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
  formatDollars,
  type CandidateSpendSummary,
} from "@/lib/spend/metrics";

export function CandidatesSpendTable({
  roleId,
  rows,
}: {
  roleId: string;
  rows: CandidateSpendSummary[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No candidates yet. Run sourcing to see spend by person.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead className="text-right">Evidence</TableHead>
            <TableHead className="text-right">Verification spend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link
                  href={`/roles/${roleId}/pipeline`}
                  className="font-medium hover:underline"
                >
                  {row.name}
                </Link>
              </TableCell>
              <TableCell className="capitalize text-muted-foreground">
                {row.stage}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.evidenceCount}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatDollars(row.spendDollars)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
