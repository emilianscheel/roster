export type PersonExperience = {
  id: string;
  companyName: string;
  companyDomain: string | null;
  title: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  sortOrder: number;
};

export type PersonEducation = {
  id: string;
  schoolName: string;
  schoolDomain: string | null;
  degree: string | null;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  sortOrder: number;
};

export type PersonListItem = {
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
  createdAt: string;
  experiences: PersonExperience[];
  education: PersonEducation[];
};

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function formatTimelineRange(
  start: string | null | undefined,
  end: string | null | undefined,
  isCurrent?: boolean,
): string {
  const s = start?.trim() || null;
  const e = isCurrent ? "Present" : end?.trim() || null;
  if (s && e) return `${s} – ${e}`;
  if (s) return isCurrent ? `${s} – Present` : s;
  if (e) return e;
  return "";
}
