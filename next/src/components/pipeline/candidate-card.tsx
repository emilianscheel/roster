"use client";

import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { PipelineCandidate } from "@/components/pipeline/types";

type CandidateCardProps = {
  candidate: PipelineCandidate;
};

export function CandidateCard({ candidate }: CandidateCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: candidate.id,
    data: { type: "candidate", candidate },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "relative space-y-1 rounded-md bg-muted/40 p-2 pr-8",
        isDragging && "opacity-40",
      )}
    >
      <button
        type="button"
        className={cn(
          "absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground",
          "hover:bg-muted hover:text-muted-foreground/80",
          "cursor-grab active:cursor-grabbing",
          "touch-none",
        )}
        aria-label={`Drag ${candidate.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="text-sm font-medium">{candidate.name}</div>
      <div className="text-xs text-muted-foreground tabular-nums">
        {(candidate.matchScore * 100).toFixed(0)}% · $
        {(candidate.verificationSpendCents / 100).toFixed(2)}
      </div>
      {candidate.strongestSignal ? (
        <div className="line-clamp-2 text-xs text-muted-foreground">
          {candidate.strongestSignal}
        </div>
      ) : null}
    </div>
  );
}

export function CandidateCardPreview({
  candidate,
}: {
  candidate: PipelineCandidate;
}) {
  return (
    <div className="relative space-y-1 rounded-md bg-muted/40 p-2 pr-8 shadow-lg ring-1 ring-foreground/10 scale-[1.02]">
      <div className="absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground">
        <GripVertical className="size-3.5" />
      </div>
      <div className="text-sm font-medium">{candidate.name}</div>
      <div className="text-xs text-muted-foreground tabular-nums">
        {(candidate.matchScore * 100).toFixed(0)}% · $
        {(candidate.verificationSpendCents / 100).toFixed(2)}
      </div>
      {candidate.strongestSignal ? (
        <div className="line-clamp-2 text-xs text-muted-foreground">
          {candidate.strongestSignal}
        </div>
      ) : null}
    </div>
  );
}
