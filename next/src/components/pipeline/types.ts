import type { PipelineStage } from "@/lib/pipeline-actions";
import type {
  PersonEducation,
  PersonExperience,
} from "@/components/people/types";

export type PipelineEvidence = {
  id: string;
  claimLabel: string;
  status: "verified" | "uncertain" | "contradicting" | "missing";
  confidence: number;
  costCents: number;
  newestEvidenceDays: number | null;
  sources: { title: string; url?: string; snippet?: string }[];
  supporting: string | null;
  contradicting: string | null;
  recommendation: string | null;
};

export type PipelinePerson = {
  id: string;
  name: string;
  email: string | null;
  headline: string | null;
  location: string | null;
  imageUrl: string | null;
  links: Record<string, string>;
  notes: string | null;
  rawText: string | null;
  lastSeenAt: string;
  experiences: PersonExperience[];
  education: PersonEducation[];
};

export type PipelineCandidate = {
  id: string;
  personId: string | null;
  name: string;
  headline: string | null;
  stage: PipelineStage | "rejected";
  matchScore: number;
  evidenceConfidence: number;
  freshnessDays: number | null;
  strongestSignal: string | null;
  missingRequirements: string[];
  contradictions: string[];
  verificationSpendCents: number;
  currentAction: string | null;
  contactUnlocked: boolean;
  outreachDraft: string | null;
  createdAt: string;
  updatedAt: string;
  person: PipelinePerson | null;
  evidence: PipelineEvidence[];
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
