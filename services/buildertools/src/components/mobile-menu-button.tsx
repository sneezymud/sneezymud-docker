import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { useSidebarStore } from "@/state/sidebar.ts";

export function MobileMenuButton() {
  const toggleSidebar = useSidebarStore((s) => s.toggle);

  return (
    <Button
      aria-label="Open navigation"
      className="lg:hidden"
      onClick={toggleSidebar}
      size="icon"
      variant="ghost"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
