import { X } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

interface TagInputProps {
  id?: string;
  onChange: (value: string) => void;
  value: string;
}

/**
 * Tag-style input for space-separated keyword strings.
 * Splits on spaces for display, joins with spaces on change.
 * Enter/Tab adds a tag, X removes one, Backspace removes last when input is empty.
 */
export function TagInput({ id, onChange, value }: TagInputProps) {
  const tags = value ? value.split(/\s+/).filter(Boolean) : [];
  const tagEntries = tags.map((tag, i) => ({ index: i, key: i, tag }));
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const next = [...tags, trimmed].join(" ");
    onChange(next);
    setDraft("");
  };

  const removeTag = (index: number) => {
    const next = tags.filter((_, i) => i !== index).join(" ");
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        addTag(draft);
      }
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <label
      className={cn(
        "border-input flex min-h-8.5 cursor-text flex-wrap items-center gap-1 rounded border bg-transparent px-2 py-1",
        "focus-within:ring-ring focus-within:ring-offset-background focus-within:ring-2 focus-within:ring-offset-1",
      )}
      htmlFor={id}
    >
      {tagEntries.map(({ index, key, tag }) => (
        <Badge
          className="gap-0.5 rounded px-1.5 font-normal"
          key={key}
          variant="secondary"
        >
          {tag}
          <Button
            aria-label={`Remove ${tag}`}
            className="-mr-0.5 ml-0.5 h-auto p-0"
            onClick={() => {
              removeTag(index);
            }}
            size="icon-xs"
            tabIndex={-1}
            variant="ghost"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      <input
        className="text-foreground placeholder:text-muted-foreground min-w-16 flex-1 border-none bg-transparent text-sm outline-none"
        id={id}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? "Add keywords\u2026" : ""}
        ref={inputRef}
        type="text"
        value={draft}
      />
    </label>
  );
}
