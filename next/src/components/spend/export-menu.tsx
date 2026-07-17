"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCsv } from "@/lib/spend/export-csv";

export type ExportOption = {
  label: string;
  filename: string;
  csv: string;
};

export function ExportMenu({ options }: { options: ExportOption[] }) {
  if (options.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="sm" variant="outline" className="gap-1.5" />}
      >
        <Download className="size-3.5" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.filename}
            onClick={() => downloadCsv(opt.filename, opt.csv)}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
