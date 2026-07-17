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
  MessageSquare,
  FileText,
  Radio,
  Columns3,
  Fingerprint,
  Mail,
  Trophy,
} from "lucide-react";

export type NavItemId =
  | "home"
  | "new"
  | "sessions"
  | "roles"
  | "people"
  | "approvals"
  | "arena"
  | "spend"
  | "knowledge"
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
  { id: "home", title: "What to do?", href: "/", icon: LayoutDashboard },
  { id: "new", title: "New", href: "/new", icon: Plus },
  { id: "sessions", title: "Sessions", href: "/sessions", icon: MessageSquare },
  { id: "roles", title: "Roles", href: "/roles", icon: Briefcase },
  { id: "people", title: "People", href: "/people", icon: Users },
  { id: "approvals", title: "Approvals", href: "/approvals", icon: ShieldCheck },
  { id: "arena", title: "Arena", href: "/arena", icon: Swords },
  { id: "spend", title: "Spend", href: "/spend", icon: Wallet },
  { id: "knowledge", title: "Best Practices", href: "/knowledge", icon: BookOpen },
];

export function roleNav(roleId: string): NavItem[] {
  const base = `/roles/${roleId}`;
  return [
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
