import { Button } from "@/components/ui/button.tsx";

export function OwnerToggle({
  onChange,
  value,
}: {
  onChange: (v: "all" | "mine") => void;
  value: "all" | "mine";
}) {
  return (
    <div className="flex gap-1">
      <Button
        onClick={() => {
          onChange("mine");
        }}
        size="sm"
        variant={value === "mine" ? "default" : "outline"}
      >
        Mine
      </Button>

      <Button
        onClick={() => {
          onChange("all");
        }}
        size="sm"
        variant={value === "all" ? "default" : "outline"}
      >
        All
      </Button>
    </div>
  );
}
