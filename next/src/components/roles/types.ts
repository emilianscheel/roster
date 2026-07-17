export type RoleListItem = {
  id: string;
  title: string;
  status: "draft" | "sourcing" | "review" | "paused" | "closed";
  seniority: string | null;
  location: string | null;
  spentCents: number;
  budgetCents: number;
  candidateCount: number;
  requirementCount: number;
};
