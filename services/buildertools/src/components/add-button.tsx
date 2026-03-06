import { Button } from "@/components/ui/button.tsx";

export function AddButton(
  props: Omit<React.ComponentProps<typeof Button>, "size" | "variant">,
) {
  return (
    <Button
      size="icon"
      variant="link"
      {...props}
    >
      Add
    </Button>
  );
}
