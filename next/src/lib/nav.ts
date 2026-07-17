import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Plus,
  Briefcase,
  Users,
  ShieldCheck,
  Swords,
  Wallet,
  BookOpen,
  FileText,
  Radio,
  Columns3,
  Fingerprint,
  Mail,
  Trophy,
  Wrench,
  Rocket,
  Zap,
} from "lucide-react";

export type NavItemId =
  | "home"
  | "new"
  | "onboarding"
  | "roles"
  | "people"
  | "approvals"
  | "tools"
  | "arena"
  | "spend"
  | "knowledge"
  | "take-action"
  | "brief"
  | "live"
  | "pipeline"
  | "evidence"
  | "outreach"
  | "outcomes"
  | "role-arena"
  | "role-spend";

export type NavItem = {
  id: NavItemId;
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export const globalNav: NavItem[] = [
  { id: "new", title: "New Role", href: "/new", icon: Plus },
  { id: "onboarding", title: "Get started", href: "/get-started", icon: Rocket },
  { id: "home", title: "What to do?", href: "/home", icon: LayoutDashboard },
  { id: "roles", title: "Roles", href: "/roles", icon: Briefcase },
  { id: "people", title: "People", href: "/people", icon: Users },
  { id: "approvals", title: "Approvals", href: "/approvals", icon: ShieldCheck },
  { id: "tools", title: "Tools", href: "/tools", icon: Wrench },
  { id: "arena", title: "Arena", href: "/arena", icon: Swords },
  { id: "spend", title: "Spend", href: "/spend", icon: Wallet },
  { id: "knowledge", title: "Best Practices", href: "/knowledge", icon: BookOpen },
];

export function roleNav(roleId: string): NavItem[] {
  const base = `/roles/${roleId}`;
  return [
    { id: "take-action", title: "Take action", href: `${base}/take-action`, icon: Zap },
    { id: "brief", title: "Brief", href: `${base}/brief`, icon: FileText },
    { id: "live", title: "Live", href: `${base}/live`, icon: Radio },
    { id: "pipeline", title: "Pipeline", href: `${base}/pipeline`, icon: Columns3 },
    { id: "evidence", title: "Evidence", href: `${base}/evidence`, icon: Fingerprint },
    { id: "outreach", title: "Outreach", href: `${base}/outreach`, icon: Mail },
    { id: "outcomes", title: "Outcomes", href: `${base}/outcomes`, icon: Trophy },
    { id: "role-arena", title: "Arena", href: `${base}/arena`, icon: Swords },
    { id: "role-spend", title: "Spend", href: `${base}/spend`, icon: Wallet },
  ];
}
