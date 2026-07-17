import type { ComponentType } from "react";
import { Globe, Link2 } from "lucide-react";
import {
  GitHubIcon,
  LinkedInIcon,
  XSocialIcon,
} from "@/components/people/social-icons";

export type PersonLinkKey =
  | "linkedin"
  | "twitter"
  | "github"
  | "personal"
  | string;

const LINK_META: Record<
  string,
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  linkedin: { label: "LinkedIn", icon: LinkedInIcon },
  twitter: { label: "X / Twitter", icon: XSocialIcon },
  x: { label: "X / Twitter", icon: XSocialIcon },
  github: { label: "GitHub", icon: GitHubIcon },
  personal: { label: "Website", icon: Globe },
  website: { label: "Website", icon: Globe },
  portfolio: { label: "Portfolio", icon: Globe },
};

export type PersonLinkItem = {
  key: string;
  label: string;
  url: string;
  displayHost: string;
  icon: ComponentType<{ className?: string }>;
};

export function normalizePersonLinkUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function personLinkLabel(key: string): string {
  return LINK_META[key.toLowerCase()]?.label ?? key;
}

export function personLinkIcon(
  key: string,
): ComponentType<{ className?: string }> {
  return LINK_META[key.toLowerCase()]?.icon ?? Link2;
}

export function listPersonLinks(
  links: Record<string, string> | null | undefined,
): PersonLinkItem[] {
  if (!links) return [];
  const preferred = [
    "linkedin",
    "twitter",
    "x",
    "github",
    "personal",
    "website",
    "portfolio",
  ];
  const seen = new Set<string>();
  const items: PersonLinkItem[] = [];

  for (const key of preferred) {
    const raw = links[key];
    if (!raw?.trim() || seen.has(key)) continue;
    if (key === "x" && links.twitter?.trim()) continue;
    seen.add(key);
    items.push(toLinkItem(key, raw));
  }

  for (const [key, raw] of Object.entries(links)) {
    if (!raw?.trim() || seen.has(key)) continue;
    if (key === "twitter" && seen.has("x")) continue;
    if (key === "x" && seen.has("twitter")) continue;
    seen.add(key);
    items.push(toLinkItem(key, raw));
  }

  return items;
}

function toLinkItem(key: string, raw: string): PersonLinkItem {
  const url = normalizePersonLinkUrl(raw);
  let displayHost = url.replace(/^https?:\/\//i, "");
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "");
    displayHost = `${parsed.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    // keep stripped prefix form
  }
  return {
    key,
    label: personLinkLabel(key),
    url,
    displayHost,
    icon: personLinkIcon(key),
  };
}

export function slugFromName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 40) || "person"
  );
}
