import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert.tsx";

interface ReadOnlyBannerProps {
  missingPowers: string[];
}

export function ReadOnlyBanner({ missingPowers }: ReadOnlyBannerProps) {
  return (
    <Alert>
      <Info className="h-4 w-4" />

      <AlertDescription>
        You are viewing this in read-only mode.
        {missingPowers.length > 0 && (
          <> Editing requires: {missingPowers.join(", ")}.</>
        )}
      </AlertDescription>
    </Alert>
  );
}
