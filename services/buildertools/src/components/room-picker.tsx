import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button.tsx";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.tsx";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { roomKeys } from "@/shared/query-keys.ts";

import { NumberInput } from "./number-input.tsx";

const roomSearchSchema = z.array(
  z.object({
    name: z.string(),
    vnum: z.number(),
  }),
);

interface RoomPickerProps {
  id?: string | undefined;
  onChange: (vnum: number) => void;
  value: number;
}

export function RoomPicker({ id, onChange, value }: RoomPickerProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: results } = useQuery({
    enabled: search.length >= 2,
    queryFn: () =>
      apiFetch(
        `/api/rooms/search?q=${encodeURIComponent(search)}`,
        roomSearchSchema,
      ),
    queryKey: roomKeys.search(search),
    staleTime: 30_000,
  });

  const items = results ?? [];

  return (
    <Popover
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setSearch("");
        }
      }}
      open={open}
    >
      <PopoverAnchor asChild>
        <div className="flex items-center gap-1">
          <NumberInput
            className="px-2 py-1"
            id={inputId}
            onValueChange={onChange}
            value={value}
          />
          <PopoverTrigger asChild>
            <Button
              aria-label="Search rooms"
              size="icon-xs"
              variant="outline"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-64 p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setSearch}
            placeholder="Search by name or vnum..."
            value={search}
          />
          <CommandList>
            {search.length < 2 ? (
              <p className="text-muted-foreground px-3 py-2 text-xs">
                Type at least 2 characters to search
              </p>
            ) : items.length === 0 ? (
              <CommandEmpty>No rooms found</CommandEmpty>
            ) : (
              items.map((item) => (
                <CommandItem
                  className="text-xs"
                  key={item.vnum}
                  onSelect={() => {
                    onChange(item.vnum);
                    setOpen(false);
                  }}
                  value={String(item.vnum)}
                >
                  <span className="text-muted-foreground font-mono">
                    {item.vnum}
                  </span>
                  {item.name}
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
