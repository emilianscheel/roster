"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToolDetailDrawer } from "@/components/tool-detail-drawer";
import {
    ZERO_TOOL_CATEGORIES,
    ZERO_TOOLS,
    type ZeroTool,
    type ZeroToolCategory,
} from "@/lib/zero-tools";

export function ToolsWorkbench({
    initialTools = ZERO_TOOLS,
    live = false,
}: {
    initialTools?: ZeroTool[];
    live?: boolean;
}) {
    const [query, setQuery] = useState("");
    const [categoryTab, setCategoryTab] = useState<string>("all");
    const [selected, setSelected] = useState<ZeroTool | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const category = categoryTab === "all" ? null : (categoryTab as ZeroToolCategory);

        return initialTools.filter((tool) => {
            if (category && tool.category !== category) return false;
            if (!q) return true;
            const haystack = [
                tool.name,
                tool.description,
                tool.whatItDoes,
                tool.provider ?? "",
                tool.price,
                tool.category,
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [query, categoryTab, initialTools]);

    function openTool(tool: ZeroTool) {
        setSelected(tool);
        setDrawerOpen(true);
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h1 className="text-lg font-semibold">Tools</h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search tools…"
                        className="pl-8"
                    />
                </div>
                <Tabs value={categoryTab} onValueChange={setCategoryTab} className="shrink-0">
                    <TabsList className="max-w-full overflow-x-auto">
                        {ZERO_TOOL_CATEGORIES.map((tab) => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {!filtered.length ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    No tools match
                </div>
            ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                    {filtered.map((tool) => (
                        <li key={tool.id}>
                            <button
                                type="button"
                                onClick={() => openTool(tool)}
                                className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                            >
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="font-medium">{tool.name}</span>
                                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                                        {tool.price}
                                    </span>
                                </div>
                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                    {tool.description}
                                </p>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <ToolDetailDrawer tool={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
        </div>
    );
}
