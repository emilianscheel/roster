import { eq, sql, and, inArray } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  approvalTasks,
  candidates,
  roles,
  zeroCalls,
} from "@/lib/db/schema";
import {
  Briefcase,
  Users,
  ShieldCheck,
  Wallet,
  BadgeCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Tile = {
  label: string;
  value: string | number;
  helper: string;
  action: string;
  href: string;
  icon: LucideIcon;
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

  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(approvalTasks)
    .where(
      and(
        eq(approvalTasks.organizationId, orgId),
        eq(approvalTasks.status, "pending"),
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
      action: "Draft a founding eng brief",
      href: "/new",
      icon: Briefcase,
    },
    {
      label: "Candidates",
      value: discovered,
      helper: "People discovered across roles",
      action: "Browse the people directory",
      href: "/people",
      icon: Users,
    },
    {
      label: "Verified",
      value: verified,
      helper: "Cleared evidence threshold",
      action: "Open roles to review shortlists",
      href: "/roles",
      icon: BadgeCheck,
    },
    {
      label: "Approvals",
      value: pending?.count ?? 0,
      helper: "Waiting on human gate",
      action: "Clear pending approvals",
      href: "/approvals",
      icon: ShieldCheck,
    },
    {
      label: "Zero spend",
      value: `$${totalSpend.toFixed(2)}`,
      helper: "Marketplace spend so far",
      action: "Audit Zero arena calls",
      href: "/arena",
      icon: Wallet,
    },
    {
      label: "Cost / verified",
      value: `$${costPerVerified.toFixed(3)}`,
      helper: "Efficiency of verification",
      action: "Review spend breakdown",
      href: "/spend",
      icon: Wallet,
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <h1 className="text-lg font-semibold">What to do?</h1>
      <div className="grid flex-1 auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} className="h-full justify-between">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <t.icon className="size-5 text-muted-foreground" />
              <CardTitle>{t.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-center gap-1">
              <div className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
                {t.value}
              </div>
              <CardDescription>{t.helper}</CardDescription>
            </CardContent>
            <CardFooter>
              <Button
                nativeButton={false}
                render={<Link href={t.href} />}
                className="w-full"
                size="lg"
              >
                {t.action}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
