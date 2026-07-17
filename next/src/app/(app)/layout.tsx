import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenuProvider } from "@/components/command-menu";
import { requireSession } from "@/lib/auth/session";
import { getGlobalNavStats } from "@/lib/nav-stats";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId } = await requireSession();
  const globalStats = await getGlobalNavStats(orgId);

  return (
    <SidebarProvider className="h-svh max-h-svh overflow-hidden">
      <CommandMenuProvider>
        <AppSidebar globalStats={globalStats} />
        <SidebarInset className="min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </CommandMenuProvider>
    </SidebarProvider>
  );
}
