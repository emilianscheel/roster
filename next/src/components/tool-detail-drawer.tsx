"use client";

import { ExternalLink, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ZeroTool } from "@/lib/zero-tools";

type ToolDetailDrawerProps = {
  tool: ZeroTool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ToolDetailDrawer({
  tool,
  open,
  onOpenChange,
}: ToolDetailDrawerProps) {
  const isMobile = useIsMobile();

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection={isMobile ? "down" : "left"}
      showSwipeHandle={isMobile}
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:28rem] data-[swipe-axis=x]:[--drawer-content-width:100%]">
        {tool ? (
          <>
            <DrawerHeader className="relative border-b border-border pb-4">
              <div className="pr-8">
                <DrawerTitle className="text-lg">{tool.name}</DrawerTitle>
                <DrawerDescription className="mt-1 text-left">
                  {tool.price}
                  {tool.provider ? ` · ${tool.provider}` : null}
                </DrawerDescription>
              </div>
              <DrawerClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-3 right-3"
                    aria-label="Close"
                  />
                }
              >
                <XIcon className="size-4" />
              </DrawerClose>
            </DrawerHeader>

            <ScrollArea className="flex-1">
              <div className="space-y-6 p-4">
                <section className="space-y-2">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Description
                  </h3>
                  <p className="text-sm text-foreground">{tool.description}</p>
                </section>

                <Separator />

                <section className="space-y-2">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    What it does
                  </h3>
                  <p className="text-sm text-foreground">{tool.whatItDoes}</p>
                </section>

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Details
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Category</dt>
                      <dd className="capitalize">{tool.category}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="tabular-nums">{tool.price}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Protocol</dt>
                      <dd>{tool.protocol ?? "Free"}</dd>
                    </div>
                    {tool.rating ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Rating</dt>
                        <dd>{tool.rating}★</dd>
                      </div>
                    ) : null}
                    {tool.provider ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Provider</dt>
                        <dd className="truncate text-right">{tool.provider}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>

                <a
                  href={tool.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-foreground underline-offset-2 hover:underline"
                >
                  Open capability URL
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </ScrollArea>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
