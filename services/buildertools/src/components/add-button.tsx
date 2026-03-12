import { Button } from "@/components/ui/button.tsx";

export function AddButton(
  props: Omit<React.ComponentProps<typeof Button>, "size" | "variant">,
) {
  return (
    <Button
      size="icon"
      variant="inline"
      {...props}
    >
      Add
    </Button>
  );
}
