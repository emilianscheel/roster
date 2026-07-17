"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ChatMessage } from "@/components/take-action/chat-message";
import { PromptComposer } from "@/components/prompt-composer";
import { Loader2 } from "lucide-react";

type TakeActionChatProps = {
  roleId: string;
  brief: string;
  initialMessages: UIMessage[];
};

export function TakeActionChat({
  roleId,
  brief,
  initialMessages,
}: TakeActionChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const { messages, sendMessage, status, error, clearError } = useChat({
    id: `take-action-${roleId}`,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/agent/recruiting",
      body: { roleId },
    }),
    onFinish: ({ messages: next }) => {
      void fetch(`/api/roles/${roleId}/messages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // Auto-start from New Role brief when the thread is empty
  useEffect(() => {
    if (startedRef.current) return;
    if (initialMessages.length > 0) {
      startedRef.current = true;
      return;
    }
    if (!brief.trim()) return;
    startedRef.current = true;
    void sendMessage({ text: brief.trim() });
  }, [brief, initialMessages.length, sendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  async function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="-m-4 flex h-full min-h-0 flex-1 flex-col overflow-hidden md:-m-6">
      <div className="mx-auto flex h-full w-full max-w-3xl min-h-0 flex-1 flex-col px-4 md:px-6">
        <header className="shrink-0 border-b py-4">
          <h1 className="font-instrument text-2xl tracking-tight">Take action</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Follow up on this role — search, verify, unlock, and outreach via Zero.
          </p>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto py-6">
          {messages.length === 0 && busy ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Starting from your brief…
            </div>
          ) : null}

          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}

          {busy && messages.at(-1)?.role === "user" ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Working…
            </div>
          ) : null}

          {error ? (
            <p className="text-destructive text-sm">
              {error.message || "Something went wrong"}
              <button
                type="button"
                className="text-foreground ml-2 underline"
                onClick={() => clearError()}
              >
                Dismiss
              </button>
            </p>
          ) : null}

          <div ref={bottomRef} />
        </div>

        <div className="bg-background sticky bottom-0 shrink-0 border-t py-4">
          <PromptComposer
            value={input}
            onChange={setInput}
            onSubmit={() => void submit()}
            placeholder="Ask to verify a candidate, draft outreach, unlock a contact…"
            busy={busy}
            size="chat"
            submitOnEnter
          />
        </div>
      </div>
    </div>
  );
}
