import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackLink({ title, to }: { title: string; to: string }) {
  return (
    <Link
      className="text-muted-foreground hover:text-foreground"
      title={title}
      to={to}
    >
      <ArrowLeft className="h-5 w-5" />
    </Link>
  );
}
