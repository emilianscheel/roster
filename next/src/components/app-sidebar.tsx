"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { globalNav, roleNav } from "@/lib/nav";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const roleMatch = pathname.match(/^\/roles\/([^/]+)/);
  const roleId = roleMatch?.[1];
  const items = roleId ? roleNav(roleId) : globalNav;

  return (
    <Sidebar collapsible="none" className="h-svh border-r">
      <SidebarHeader className="px-3 py-4">
        <Link href="/" className="font-heading flex items-center gap-2 text-lg tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background text-xs font-sans">
            R
          </span>
          <span>Roster</span>
        </Link>
        {roleId ? (
          <Link
            href="/roles"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Roles
          </Link>
        ) : null}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={active}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
