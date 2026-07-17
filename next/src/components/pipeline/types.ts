import type { PipelineStage } from "@/lib/pipeline-actions";

export type PipelineCandidate = {
  id: string;
  name: string;
  headline: string | null;
  stage: PipelineStage | "rejected";
  matchScore: number;
  verificationSpendCents: number;
  strongestSignal: string | null;
};

export const PIPELINE_STAGES = [
  "discovered",
  "researching",
  "verified",
  "approved",
  "contacted",
  "replied",
  "interview",
] as const satisfies readonly PipelineStage[];
