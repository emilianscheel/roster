"use client";

import type { UIMessage } from "ai";
import { isToolUIPart, getToolName } from "ai";
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

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "flex w-full max-w-[46rem] flex-col gap-2",
          isUser ? "items-end" : "items-start",
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
      </div>
    </div>
  );
}
