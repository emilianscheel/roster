import type { ComponentType } from "react";
import {
  Ban,
  Briefcase,
  Check,
  GitBranch,
  Link,
  Mail,
  Phone,
  Radar,
  Search,
  SkipForward,
  Sparkles,
  UserSearch,
  X,
  type LucideProps,
} from "lucide-react";
import {
  ZERO_TOOL_CATEGORIES,
  ZERO_TOOLS,
  type ZeroToolCategory,
} from "@/lib/zero-tools";

export type IconComponent = ComponentType<LucideProps>;

export type ServiceMeta = {
  displayName: string;
  category: ZeroToolCategory | null;
  categoryLabel: string | null;
  Icon: IconComponent;
};

const CATEGORY_ICONS: Record<ZeroToolCategory, IconComponent> = {
  search: Search,
  enrichment: UserSearch,
  contact: Radar,
  linkedin: Link,
  jobs: Briefcase,
  outreach: Mail,
  signals: GitBranch,
};

const CATEGORY_LABELS = Object.fromEntries(
  ZERO_TOOL_CATEGORIES.filter((c) => c.value !== "all").map((c) => [
    c.value,
    c.label,
  ]),
) as Record<ZeroToolCategory, string>;

/** Exact slug overrides for demo/common services (icon and/or category). */
const SLUG_META: Record<
  string,
  { category?: ZeroToolCategory; icon?: IconComponent }
> = {
  "profile-scraper": { category: "search", icon: UserSearch },
  "person-enrichment": { category: "enrichment", icon: UserSearch },
  "targeted-search": { category: "search", icon: Search },
  "github-signals": { category: "signals", icon: GitBranch },
  "contact-enrichment": { category: "contact", icon: Radar },
  "outreach-mail": { category: "outreach", icon: Mail },
  "outreach-followup": { category: "outreach", icon: Mail },
  "outreach-call": { category: "outreach", icon: Phone },
  zero: { icon: Sparkles },
};

const TOOLS_BY_ID = new Map(ZERO_TOOLS.map((tool) => [tool.id, tool]));

export function humanizeService(service: string): string {
  return service
    .split(/[-_./]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function humanizeCapability(capability: string): string {
  const parts = capability.split(/[._]/).filter(Boolean);
  if (parts.length === 0) return capability;
  return parts
    .map((part, i) =>
      i === 0
        ? part.charAt(0).toUpperCase() + part.slice(1)
        : part.toLowerCase(),
    )
    .join(" ");
}

/** Strip trailing parentheticals for cleaner spend/activity labels. */
function cleanDisplayName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/g, "").trim() || name;
}

export function resolveServiceMeta(service: string): ServiceMeta {
  const tool = TOOLS_BY_ID.get(service);
  const slug = SLUG_META[service];
  const category = tool?.category ?? slug?.category ?? null;
  const Icon =
    slug?.icon ??
    (category ? CATEGORY_ICONS[category] : undefined) ??
    Sparkles;

  return {
    displayName: tool
      ? cleanDisplayName(tool.name)
      : humanizeService(service),
    category,
    categoryLabel: category ? CATEGORY_LABELS[category] : null,
    Icon,
  };
}

export const CALL_STATUS_META: Record<
  string,
  { label: string; icon: IconComponent; className: string }
> = {
  success: {
    label: "Success",
    icon: Check,
    className: "text-emerald-700 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    icon: X,
    className: "text-destructive",
  },
  blocked: {
    label: "Blocked",
    icon: Ban,
    className: "text-amber-700 dark:text-amber-400",
  },
  skipped: {
    label: "Skipped",
    icon: SkipForward,
    className: "text-muted-foreground",
  },
};

export function formatRelativeTime(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (abs < 60) return rtf.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return rtf.format(months, "month");
  return rtf.format(Math.round(months / 12), "year");
}
