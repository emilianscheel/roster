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
  Bot,
  FileText,
  Radio,
  Columns3,
  Fingerprint,
  Mail,
  Trophy,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export const globalNav: NavItem[] = [
  { title: "What to do?", href: "/", icon: LayoutDashboard },
  { title: "New", href: "/new", icon: Plus },
  { title: "Roles", href: "/roles", icon: Briefcase },
  { title: "People", href: "/people", icon: Users },
  { title: "Approvals", href: "/approvals", icon: ShieldCheck },
  { title: "Arena", href: "/arena", icon: Swords },
  { title: "Spend", href: "/spend", icon: Wallet },
  { title: "Best Practices", href: "/knowledge", icon: BookOpen },
  { title: "Agent", href: "/agent", icon: Bot },
];

export function roleNav(roleId: string): NavItem[] {
  const base = `/roles/${roleId}`;
  return [
    { title: "Brief", href: `${base}/brief`, icon: FileText },
    { title: "Live", href: `${base}/live`, icon: Radio },
    { title: "Pipeline", href: `${base}/pipeline`, icon: Columns3 },
    { title: "Evidence", href: `${base}/evidence`, icon: Fingerprint },
    { title: "Outreach", href: `${base}/outreach`, icon: Mail },
    { title: "Outcomes", href: `${base}/outcomes`, icon: Trophy },
    { title: "Arena", href: `${base}/arena`, icon: Swords },
    { title: "Spend", href: `${base}/spend`, icon: Wallet },
  ];
}
