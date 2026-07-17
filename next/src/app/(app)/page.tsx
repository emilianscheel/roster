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
import Link from "next/link";

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

  const tiles = [
    { label: "Roles", value: roleCount?.count ?? 0, icon: Briefcase, href: "/roles" },
    { label: "Candidates", value: discovered, icon: Users, href: "/people" },
    { label: "Verified", value: verified, icon: BadgeCheck, href: "/roles" },
    {
      label: "Approvals",
      value: pending?.count ?? 0,
      icon: ShieldCheck,
      href: "/approvals",
    },
    {
      label: "Zero spend",
      value: `$${totalSpend.toFixed(2)}`,
      icon: Wallet,
      href: "/spend",
    },
    {
      label: "Cost / verified",
      value: `$${costPerVerified.toFixed(3)}`,
      icon: Wallet,
      href: "/spend",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Command</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40"
          >
            <t.icon className="size-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-semibold tabular-nums">{t.value}</div>
              <div className="text-xs text-muted-foreground">{t.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
