"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { globalNav, roleNav, type NavItem } from "@/lib/nav";
import type { NavStats } from "@/lib/nav-stats";
import { loadRoleNavStats } from "@/lib/nav-stats-actions";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

type AppSidebarProps = {
  globalStats: NavStats;
};

export function AppSidebar({ globalStats }: AppSidebarProps) {
  const pathname = usePathname();
  const roleMatch = pathname.match(/^\/roles\/([^/]+)/);
  const roleId = roleMatch?.[1];
  const panel = roleId ? "role" : "global";
  const items = roleId ? roleNav(roleId) : globalNav;

  const prevRoleIdRef = useRef<string | undefined>(roleId);
  let direction = 0;
  if (roleId && !prevRoleIdRef.current) direction = 1;
  else if (!roleId && prevRoleIdRef.current) direction = -1;

  useEffect(() => {
    prevRoleIdRef.current = roleId;
  }, [roleId]);

  const [roleStats, setRoleStats] = useState<NavStats>({});

  useEffect(() => {
    if (!roleId) {
      setRoleStats({});
      return;
    }
    let cancelled = false;
    loadRoleNavStats(roleId).then((stats) => {
      if (!cancelled) setRoleStats(stats);
    });
    return () => {
      cancelled = true;
    };
  }, [roleId]);

  const stats = roleId ? roleStats : globalStats;

  return (
    <Sidebar collapsible="none" className="h-svh border-r">
      <SidebarHeader className="px-3 py-4">
        <Link
          href="/"
          className="font-heading flex items-center gap-2 text-lg tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background text-xs font-sans">
            R
          </span>
          <span>Roster</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="relative overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={panel}
            custom={direction}
            variants={{
              enter: (d: number) => ({
                x: d > 0 ? 24 : d < 0 ? -24 : 0,
                opacity: 0,
              }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({
                x: d > 0 ? -24 : d < 0 ? 24 : 0,
                opacity: 0,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="w-full"
          >
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {roleId ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        render={<Link href="/roles" />}
                        tooltip="Roles"
                      >
                        <ChevronLeft />
                        <span>Roles</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : null}
                  {items.map((item) => (
                    <NavMenuItem
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      stat={stats[item.id]}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </motion.div>
        </AnimatePresence>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() =>
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = "/sign-in";
                },
              },
            })
          }
        >
          <LogOut className="size-4" />
          <span>Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavMenuItem({
  item,
  pathname,
  stat,
}: {
  item: NavItem;
  pathname: string;
  stat?: string;
}) {
  const active =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={item.href} />}
        isActive={active}
        tooltip={item.title}
      >
        <item.icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
      {stat != null ? (
        <SidebarMenuBadge className="text-muted-foreground font-normal">
          {stat}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}
