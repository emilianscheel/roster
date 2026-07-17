import { eq, sql, and, inArray, isNull, lte, or } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  approvalTasks,
  candidates,
  roles,
  zeroCalls,
} from "@/lib/db/schema";
import {
  BadgeCheck,
  Briefcase,
  Code2,
  Search,
  ShieldCheck,
  Swords,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ExampleAction = {
  icon: LucideIcon;
  label: string;
  href: string;
};

type Tile = {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  examples: ExampleAction[];
};

export default async function CommandPage() {
  const { orgId } = await requireSession();

  const [roleCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roles)
    .where(eq(roles.organizationId, orgId));

  const orgRoles = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.organizationId, orgId));
  const roleIds = orgRoles.map((r) => r.id);

  let verified = 0;
  let discovered = 0;
  if (roleIds.length) {
    const candStats = await db
      .select({
        stage: candidates.stage,
        count: sql<number>`count(*)::int`,
      })
      .from(candidates)
      .where(inArray(candidates.roleId, roleIds))
      .groupBy(candidates.stage);
    for (const row of candStats) {
      discovered += row.count;
      if (
        row.stage === "verified" ||
        row.stage === "approved" ||
        row.stage === "contacted"
      ) {
        verified += row.count;
      }
    }
  }

  const now = new Date();
  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(approvalTasks)
    .where(
      and(
        eq(approvalTasks.organizationId, orgId),
        eq(approvalTasks.status, "pending"),
        or(isNull(approvalTasks.remindAt), lte(approvalTasks.remindAt, now)),
      ),
    );

  const [spend] = await db
    .select({
      total: sql<number>`coalesce(sum(${zeroCalls.actualCents}), 0)`,
    })
    .from(zeroCalls)
    .where(eq(zeroCalls.organizationId, orgId));

  const totalSpend = Number(spend?.total || 0);
  const costPerVerified = verified > 0 ? totalSpend / verified : 0;

  const tiles: Tile[] = [
    {
      label: "Roles",
      value: roleCount?.count ?? 0,
      helper: "Open roles you can run",
      icon: Briefcase,
      examples: [
        {
          icon: Search,
          label:
            "Find a founding infra engineer with Rust, Kubernetes, and recent OSS",
          href: "/new",
        },
        {
          icon: Users,
          label:
            "Shortlist three founding infra candidates with evidence before outreach",
          href: "/new",
        },
        {
          icon: Code2,
          label:
            "Source platform engineers transitioning from SRE into infrastructure",
          href: "/new",
        },
      ],
    },
    {
      label: "Candidates",
      value: discovered,
      helper: "People discovered across roles",
      icon: Users,
      examples: [
        {
          icon: Users,
          label: "Browse the people directory",
          href: "/people",
        },
        {
          icon: Briefcase,
          label: "Open roles to find new candidates",
          href: "/roles",
        },
        {
          icon: ShieldCheck,
          label: "Clear approvals blocking candidate progress",
          href: "/approvals",
        },
      ],
    },
    {
      label: "Verified",
      value: verified,
      helper: "Cleared evidence threshold",
      icon: BadgeCheck,
      examples: [
        {
          icon: Briefcase,
          label: "Open roles to review shortlists",
          href: "/roles",
        },
        {
          icon: Users,
          label: "Inspect verified people",
          href: "/people",
        },
        {
          icon: ShieldCheck,
          label: "Approve contact unlocks for verified fits",
          href: "/approvals",
        },
      ],
    },
    {
      label: "Approvals",
      value: pending?.count ?? 0,
      helper: "Waiting on human gate",
      icon: ShieldCheck,
      examples: [
        {
          icon: ShieldCheck,
          label: "Clear pending approvals",
          href: "/approvals",
        },
        {
          icon: Users,
          label: "Review people waiting on a human gate",
          href: "/people",
        },
        {
          icon: Briefcase,
          label: "Jump back to roles after deciding",
          href: "/roles",
        },
      ],
    },
    {
      label: "Zero spend",
      value: `$${totalSpend.toFixed(2)}`,
      helper: "Marketplace spend so far",
      icon: Wallet,
      examples: [
        {
          icon: Swords,
          label: "Audit Zero arena calls",
          href: "/arena",
        },
        {
          icon: Wallet,
          label: "Review spend breakdown",
          href: "/spend",
        },
        {
          icon: Briefcase,
          label: "Open roles to check per-role spend",
          href: "/roles",
        },
      ],
    },
    {
      label: "Cost / verified",
      value: `$${costPerVerified.toFixed(3)}`,
      helper: "Efficiency of verification",
      icon: Wallet,
      examples: [
        {
          icon: Wallet,
          label: "Review spend breakdown",
          href: "/spend",
        },
        {
          icon: Swords,
          label: "Compare tool costs in the arena",
          href: "/arena",
        },
        {
          icon: Briefcase,
          label: "Open roles to improve verification efficiency",
          href: "/roles",
        },
      ],
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <h1 className="text-lg font-semibold">What to do?</h1>
      <div className="grid flex-1 auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} className="h-full">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <t.icon className="size-5 text-muted-foreground" />
              <CardTitle>{t.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-1">
              <div className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
                {t.value}
              </div>
              <CardDescription>{t.helper}</CardDescription>
            </CardContent>
            <div className="mt-auto flex flex-col items-stretch gap-2.5 px-(--card-spacing)">
              {t.examples.map((ex) => (
                <Link
                  key={ex.label}
                  href={ex.href}
                  className="group flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <ex.icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <span className="truncate text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                    {ex.label}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
