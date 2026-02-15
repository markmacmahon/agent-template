"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/keys";

interface EditableTitleProps {
  value: string;
  placeholder?: string;
  onSave: (newTitle: string) => void | Promise<void>;
  className?: string;
  /** When true, click and input events do not bubble (e.g. so sidebar row click doesn't select thread). */
  stopPropagation?: boolean;
  /** Optional label for the edit control (accessibility). */
  "aria-label"?: string;
}

export function EditableTitle({
  value,
  placeholder = t("CHAT_TITLE_PLACEHOLDER"),
  onSave,
  className,
  stopPropagation = false,
  "aria-label": ariaLabel,
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = value.trim() || placeholder;
  const previousValue = value;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const commit = async () => {
    const trimmed = inputValue.trim();
    if (trimmed === "") {
      setInputValue(previousValue);
      setIsEditing(false);
      return;
    }
    await onSave(trimmed);
    setIsEditing(false);
  };

  const revert = () => {
    setInputValue(previousValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      revert();
    }
  };

  const handleBlur = () => {
    void commit();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        aria-label={ariaLabel ?? t("CHAT_TITLE_CLICK_TO_EDIT")}
        className={cn(
          "w-full min-w-0 rounded border border-input bg-background px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={stopPropagation ? (e) => e.stopPropagation() : undefined}
      title={t("CHAT_TITLE_CLICK_TO_EDIT")}
      aria-label={ariaLabel ?? t("CHAT_TITLE_CLICK_TO_EDIT")}
      className={cn(
        "w-full min-w-0 truncate text-left text-sm font-medium outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 rounded",
        !value.trim() && "text-muted-foreground",
        className,
      )}
    >
      {displayValue}
    </button>
  );
}
