"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  CandidateCard,
  CandidateCardPreview,
} from "@/components/pipeline/candidate-card";
import {
  PIPELINE_STAGES,
  type PipelineCandidate,
} from "@/components/pipeline/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  updateCandidateStage,
  type PipelineStage,
} from "@/lib/pipeline-actions";

type PipelineBoardProps = {
  roleId: string;
  candidates: PipelineCandidate[];
};

function isStage(id: string): id is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(id);
}

function groupByStage(
  list: PipelineCandidate[],
): Record<PipelineStage, PipelineCandidate[]> {
  const groups = Object.fromEntries(
    PIPELINE_STAGES.map((stage) => [stage, [] as PipelineCandidate[]]),
  ) as Record<PipelineStage, PipelineCandidate[]>;

  for (const candidate of list) {
    if (isStage(candidate.stage)) {
      groups[candidate.stage].push(candidate);
    }
  }
  return groups;
}

function PipelineColumn({
  stage,
  items,
}: {
  stage: PipelineStage;
  items: PipelineCandidate[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <Card
      size="sm"
      className={`flex h-full min-h-0 min-w-0 flex-1 flex-col gap-0 py-0 ${
        isOver ? "ring-2 ring-ring/40" : ""
      }`}
    >
      <CardHeader className="shrink-0 border-b px-3 py-2.5">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {stage} · {items.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div ref={setNodeRef} className="min-h-24 space-y-2 p-2">
            <SortableContext
              items={items.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </SortableContext>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function PipelineBoard({ roleId, candidates }: PipelineBoardProps) {
  const [items, setItems] = useState(candidates);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originStage, setOriginStage] = useState<PipelineStage | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const haystack = [c.name, c.headline ?? "", c.strongestSignal ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  const columns = useMemo(() => groupByStage(filtered), [filtered]);
  const activeCandidate = activeId
    ? (items.find((c) => c.id === activeId) ?? null)
    : null;

  function findContainer(
    id: string,
    list: PipelineCandidate[] = items,
  ): PipelineStage | undefined {
    if (isStage(id)) return id;
    const candidate = list.find((c) => c.id === id);
    if (candidate && isStage(candidate.stage)) return candidate.stage;
    return undefined;
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);
    const stage = findContainer(id);
    setOriginStage(stage ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    setItems((prev) =>
      prev.map((c) =>
        c.id === String(active.id)
          ? { ...c, stage: overContainer }
          : c,
      ),
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const candidateId = String(active.id);
    const fromStage = originStage;
    setActiveId(null);
    setOriginStage(null);

    if (!over || !fromStage) {
      if (fromStage) {
        setItems((prev) =>
          prev.map((c) =>
            c.id === candidateId ? { ...c, stage: fromStage } : c,
          ),
        );
      }
      return;
    }

    const nextStage = findContainer(String(over.id));
    if (!nextStage) {
      setItems((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, stage: fromStage } : c,
        ),
      );
      return;
    }

    setItems((prev) =>
      prev.map((c) =>
        c.id === candidateId ? { ...c, stage: nextStage } : c,
      ),
    );

    if (fromStage === nextStage) return;

    const result = await updateCandidateStage({
      roleId,
      candidateId,
      stage: nextStage,
    });

    if (!result.ok) {
      setItems((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, stage: fromStage } : c,
        ),
      );
      toast.error(result.error);
    }
  }

  function handleDragCancel(event: DragCancelEvent) {
    const candidateId = String(event.active.id);
    const fromStage = originStage;
    setActiveId(null);
    setOriginStage(null);
    if (!fromStage) return;
    setItems((prev) =>
      prev.map((c) =>
        c.id === candidateId ? { ...c, stage: fromStage } : c,
      ),
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">Pipeline</h1>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates…"
            className="pl-8"
            aria-label="Search candidates"
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex min-h-0 flex-1 gap-3">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              items={columns[stage]}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}>
          {activeCandidate ? (
            <CandidateCardPreview candidate={activeCandidate} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
