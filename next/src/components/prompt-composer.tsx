"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PromptComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  busy?: boolean;
  /** New Role uses a tall box; chat uses a compact one. */
  size?: "hero" | "chat";
  /** Chat: Enter sends, Shift+Enter newline. Hero: Cmd/Ctrl+Enter sends. */
  submitOnEnter?: boolean;
  className?: string;
  textareaClassName?: string;
};

export function PromptComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  busy,
  size = "chat",
  submitOnEnter = true,
  className,
  textareaClassName,
}: PromptComposerProps) {
  const canSend = !disabled && !busy && Boolean(value.trim());

  return (
    <div className={cn("relative w-full", className)}>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || busy}
        className={cn(
          "resize-none rounded-xl pb-12 pr-14 text-base",
          size === "hero" ? "min-h-40" : "min-h-24 max-h-48",
          textareaClassName,
        )}
        onKeyDown={(e) => {
          if (submitOnEnter) {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSubmit();
            }
            return;
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
      />
      <div className="absolute right-2 bottom-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-full"
          disabled={!canSend}
          onClick={() => onSubmit()}
          aria-label="Send"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
