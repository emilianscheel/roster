"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";

export function CodingAgentChat() {
  const [input, setInput] = useState("");
  const [demoMessages, setDemoMessages] = useState<
    { id: string; role: string; text: string }[]
  >([]);
  const [demoBusy, setDemoBusy] = useState(false);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agent/coding" }),
    [],
  );
  const { messages, sendMessage, status } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming" || demoBusy;

  async function submitDemo(text: string) {
    setDemoBusy(true);
    setDemoMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", text },
    ]);
    try {
      const res = await fetch("/api/agent/coding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              parts: [{ type: "text", text }],
            },
          ],
        }),
      });
      const data = await res.json();
      setDemoMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.message || data.output || JSON.stringify(data),
        },
      ]);
    } finally {
      setDemoBusy(false);
    }
  }

  const useDemo = !process.env.NEXT_PUBLIC_AI_ENABLED;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3">
      <ScrollArea className="flex-1 rounded-lg border border-border p-4">
        <div className="space-y-4">
          {useDemo
            ? demoMessages.map((m) => (
                <div key={m.id} className="space-y-1">
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    {m.role}
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{m.text}</div>
                </div>
              ))
            : messages.map((m) => (
                <div key={m.id} className="space-y-1">
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    {m.role}
                  </div>
                  <div className="whitespace-pre-wrap text-sm">
                    {m.parts?.map((p, i) =>
                      p.type === "text" ? (
                        <span key={i}>{p.text}</span>
                      ) : p.type.startsWith("tool-") ? (
                        <span
                          key={i}
                          className="my-1 block rounded bg-muted px-2 py-1 font-mono text-xs"
                        >
                          {p.type}
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>
              ))}
          {(useDemo ? demoMessages : messages).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sandbox agent</p>
          ) : null}
        </div>
      </ScrollArea>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || busy) return;
          const text = input;
          setInput("");
          if (useDemo) {
            void submitDemo(text);
          } else {
            void sendMessage({ text });
          }
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the coding agent…"
          className="min-h-12 resize-none"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !input.trim()} size="icon">
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
