import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiFetch } from "@/shared/api-client.ts";

const roomNameSchema = z.object({
  name: z.string().nullable(),
  vnum: z.number(),
});

export function useRoomName(vnum: number) {
  return useQuery({
    enabled: vnum > 0,
    queryFn: () => apiFetch(`/api/rooms/name/${String(vnum)}`, roomNameSchema),
    queryKey: ["room-name", vnum],
    staleTime: 5 * 60 * 1000,
  });
}
