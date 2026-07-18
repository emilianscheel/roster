"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { isToolUIPart, getToolName } from "ai";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ToolActionCard,
  summarizeToolOutput,
  toolPartStatus,
} from "@/components/take-action/tool-action-card";

type ChatMessageProps = {
  message: UIMessage;
};

function toolNameFromPart(part: UIMessage["parts"][number]): string | null {
  if (part.type === "dynamic-tool") return part.toolName;
  if (isToolUIPart(part)) return getToolName(part);
  return null;
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function formatShortTime(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function createdAtFromMessage(message: UIMessage): string | null {
  const meta = message.metadata;
  if (!meta || typeof meta !== "object") return null;
  const createdAt = (meta as { createdAt?: unknown }).createdAt;
  return typeof createdAt === "string" ? createdAt : null;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createdAt = createdAtFromMessage(message);
  const shortTime = createdAt ? formatShortTime(createdAt) : null;
  const text = messageText(message);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  async function copyText() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "flex w-full max-w-[46rem] flex-col",
          isUser ? "group/msg items-end gap-1" : "items-start gap-2",
        )}
      >
        <div
          className={cn(
            "w-full space-y-2 text-[15px] leading-relaxed",
            isUser
              ? "bg-muted/50 rounded-2xl px-4 py-3"
              : "text-foreground",
          )}
        >
          {message.parts.map((part, i) => {
            if (part.type === "text") {
              if (!part.text.trim()) return null;
              return (
                <p key={i} className="whitespace-pre-wrap">
                  {part.text}
                </p>
              );
            }

            const name = toolNameFromPart(part);
            if (!name) return null;

            const state = "state" in part ? String(part.state) : undefined;
            const output = "output" in part ? part.output : undefined;
            const input = "input" in part ? part.input : undefined;
            const fromOutput = summarizeToolOutput(output);
            const status =
              fromOutput.status !== "done"
                ? fromOutput.status
                : toolPartStatus(state);

            const inputSummary =
              input &&
              typeof input === "object" &&
              "summary" in input &&
              typeof (input as { summary?: unknown }).summary === "string"
                ? (input as { summary: string }).summary
                : input &&
                    typeof input === "object" &&
                    "query" in input &&
                    typeof (input as { query?: unknown }).query === "string"
                  ? (input as { query: string }).query
                  : input &&
                      typeof input === "object" &&
                      "purpose" in input &&
                      typeof (input as { purpose?: unknown }).purpose === "string"
                    ? (input as { purpose: string }).purpose
                    : undefined;

            return (
              <ToolActionCard
                key={"toolCallId" in part ? String(part.toolCallId) : i}
                name={name}
                status={status}
                summary={fromOutput.summary ?? inputSummary}
                detail={fromOutput.detail}
              />
            );
          })}
        </div>

        {isUser ? (
          <div className="flex items-center gap-0.5 pr-0.5">
            {shortTime ? (
              <span className="text-muted-foreground px-1 text-[11px] tabular-nums">
                {shortTime}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "text-muted-foreground opacity-0 transition-opacity duration-150",
                "group-hover/msg:opacity-100 focus-visible:opacity-100",
              )}
              aria-label={copied ? "Copied" : "Copy message"}
              disabled={!text}
              onClick={() => void copyText()}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
