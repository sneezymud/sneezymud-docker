import { useState } from "react";

import type { MobExtra, MobStringKeyword } from "@/shared/schemas/mob.ts";

import { AddButton } from "@/components/add-button.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { SectionHeader } from "@/components/section-header.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useRowKeys } from "@/hooks/use-row-keys.ts";
import { mobExtraSchema, mobStringKeywords } from "@/shared/schemas/mob.ts";

const MOB_STRING_LABELS: Record<MobStringKeyword, string> = {
  bamfin: "Enter World",
  bamfout: "Leave World",
  deathcry: "Death Cry",
  movein: "Room Enter",
  moveout: "Room Leave",
  repop: "Respawn",
};

export function MobStringsEditor({
  onChange,
  readOnly,
  rows,
  vnum,
}: {
  onChange: (rows: MobExtra[]) => void;
  readOnly?: boolean;
  rows: MobExtra[];
  vnum: number;
}) {
  const [pendingRemove, setPendingRemove] = useState<null | number>(null);
  const { addKey, removeKey, rowKeys } = useRowKeys(rows.length);

  const usedKeywords = new Set(rows.map((r) => r.keyword));
  const availableKeywords = mobStringKeywords.filter(
    (k) => !usedKeywords.has(k),
  );

  const addRow = () => {
    const keyword = availableKeywords[0];
    if (!keyword) {
      return;
    }
    addKey();
    onChange([...rows, { description: "", keyword, vnum }]);
  };

  const removeRow = (index: number) => {
    removeKey(index);
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <fieldset
      className="bg-card border-border/50 rounded-lg border p-5"
      disabled={readOnly}
    >
      <SectionHeader
        action={
          readOnly ? undefined : (
            <AddButton
              aria-label="Add mobile string"
              disabled={availableKeywords.length === 0}
              onClick={addRow}
            />
          )
        }
        title="Mobile Strings"
        tooltip={
          <>
            <p className="font-medium">
              Custom messages displayed during mob events.
            </p>

            <ul className="mt-1.5 ml-3 list-disc">
              <li>
                <strong>Enter World</strong> - shown when the mob first appears
              </li>

              <li>
                <strong>Leave World</strong> - shown when the mob is removed
              </li>

              <li>
                <strong>Death Cry</strong> - "Your blood freezes..." message on
                death
              </li>

              <li>
                <strong>Respawn</strong> - shown when the mob repopulates
              </li>

              <li>
                <strong>Room Enter</strong> - replaces "X has arrived" when
                entering a room
              </li>

              <li>
                <strong>Room Leave</strong> - replaces "X leaves north" when
                leaving a room
              </li>
            </ul>
          </>
        }
      />

      <div className="space-y-3">
        {rows.map((row, index) => (
          <MobStringRow
            index={index}
            key={rowKeys[index]}
            onDescriptionChange={(description) => {
              onChange(
                rows.map((r, i) => (i === index ? { ...r, description } : r)),
              );
            }}
            onKeywordChange={(keyword) => {
              onChange(
                rows.map((r, i) => (i === index ? { ...r, keyword } : r)),
              );
            }}
            onRemove={() => {
              setPendingRemove(index);
            }}
            row={row}
            usedKeywords={usedKeywords}
          />
        ))}
      </div>

      <ConfirmDialog
        confirmLabel="Remove"
        message="Remove this mobile string?"
        onCancel={() => {
          setPendingRemove(null);
        }}
        onConfirm={() => {
          if (pendingRemove !== null) {
            removeRow(pendingRemove);
          }
          setPendingRemove(null);
        }}
        open={pendingRemove !== null}
        variant="danger"
      />
    </fieldset>
  );
}

function MobStringRow({
  index,
  onDescriptionChange,
  onKeywordChange,
  onRemove,
  row,
  usedKeywords,
}: {
  index: number;
  onDescriptionChange: (description: string) => void;
  onKeywordChange: (keyword: MobStringKeyword) => void;
  onRemove: () => void;
  row: MobExtra;
  usedKeywords: Set<MobStringKeyword>;
}) {
  return (
    <div className="border-border/30 bg-muted/20 space-y-2 rounded border p-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor={`mstr-${index}-keyword`}>Type</Label>

          <Select
            onValueChange={(v) => {
              onKeywordChange(mobExtraSchema.shape.keyword.parse(v));
            }}
            value={row.keyword}
          >
            <SelectTrigger
              className="w-full"
              id={`mstr-${index}-keyword`}
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent position="popper">
              {mobStringKeywords
                .filter((k) => k === row.keyword || !usedKeywords.has(k))
                .map((k) => (
                  <SelectItem
                    key={k}
                    value={k}
                  >
                    {MOB_STRING_LABELS[k]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          aria-label={`Remove ${MOB_STRING_LABELS[row.keyword]} string`}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive mt-5 ml-2 shrink-0"
          onClick={onRemove}
          size="xs"
          variant="ghost"
        >
          Remove
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`mstr-${index}-description`}>Message</Label>

        <Textarea
          className="min-h-16 text-base"
          id={`mstr-${index}-description`}
          onChange={(e) => {
            onDescriptionChange(e.target.value);
          }}
          value={row.description}
        />
      </div>
    </div>
  );
}
