"use client";

import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { logoInitials } from "@/lib/logo-dev";

type CompanyLogoProps = {
  /** Company or school display name (used for alt text and initials). */
  name: string;
  /** Domain for Logo.dev lookup, e.g. "stripe.com". */
  domain?: string | null;
  size?: number;
  className?: string;
};

/**
 * Company/school mark via Logo.dev. Falls back to local initials when no
 * domain or token is available.
 */
export function CompanyLogo({
  name,
  domain,
  size = 32,
  className,
}: CompanyLogoProps) {
  const trimmed = domain?.trim();

  if (!trimmed) {
    return (
      <span
        role="img"
        aria-label={`${name} logo`}
        className={cn(
          "inline-flex shrink-0 select-none items-center justify-center rounded-md bg-muted font-medium text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)) }}
      >
        {logoInitials(name)}
      </span>
    );
  }

  return (
    <Logo
      domain={trimmed}
      label={name}
      size={size}
      fallback="initials"
      className={cn("shrink-0 rounded-md object-contain", className)}
    />
  );
}
