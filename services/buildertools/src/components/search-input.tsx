import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";

export function SearchInput({
  className,
  onChange,
  placeholder,
  value,
}: {
  className?: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  value: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Input
        aria-label={placeholder ?? "Search"}
        className="pr-8"
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        type="text"
        value={value}
      />

      {value ? (
        <Button
          aria-label="Clear search"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          onClick={() => {
            onChange("");
          }}
          size="icon-xs"
          variant="ghost"
        >
          {"\u2715"}
        </Button>
      ) : null}
    </div>
  );
}
