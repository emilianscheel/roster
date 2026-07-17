"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";

const PIPELINE_PATH = /^\/roles\/[^/]+\/pipeline/;

export function ForceSidebarExpanded() {
  const pathname = usePathname();
  const { setOpen } = useSidebar();

  useEffect(() => {
    if (PIPELINE_PATH.test(pathname)) {
      setOpen(true);
    }
  }, [pathname, setOpen]);

  return null;
}
