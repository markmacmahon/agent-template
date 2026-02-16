"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/keys";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled: boolean;
  placeholder?: string;
  onStop?: () => void;
}

export function MessageInput({
  onSendMessage,
  disabled,
  placeholder = t("CHAT_PLACEHOLDER"),
  onStop,
}: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "44px";
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(scrollHeight, 200)}px`;
  }, [input]);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = useCallback(() => {
    const trimmedInput = input.trim();
    if (trimmedInput && !disabled) {
      onSendMessage(trimmedInput);
      setInput("");
      resetHeight();

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [input, disabled, onSendMessage, resetHeight]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sticky bottom-0 z-[1] mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (disabled && onStop) {
            onStop();
          } else {
            handleSend();
          }
        }}
        className="flex w-full flex-col gap-0 rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-ring hover:border-muted-foreground/50"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled && !onStop}
          className="grow resize-none border-0 bg-transparent p-2 text-base shadow-none outline-none ring-0 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          rows={1}
          style={{ minHeight: "44px", maxHeight: "200px" }}
          data-testid="chat-message-input"
        />

        <div className="flex items-center justify-end pt-1">
          {disabled && onStop ? (
            <Button
              type="button"
              onClick={onStop}
              size="icon"
              className="size-8 rounded-full bg-foreground text-background transition-colors duration-200 hover:bg-foreground/90"
              data-testid="stop-button"
            >
              <SquareIcon className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={disabled || !input.trim()}
              size="icon"
              className={cn(
                "size-8 rounded-full",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:bg-muted disabled:text-muted-foreground",
                "transition-colors duration-200",
              )}
              data-testid="send-button"
            >
              <ArrowUpIcon className="size-3.5" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
