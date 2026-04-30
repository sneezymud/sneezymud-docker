import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { useEntityListMutations } from "@/hooks/use-entity-list-mutations.ts";
import { useOwnerFilter } from "@/hooks/use-owner-filter.ts";
import { entityKeys } from "@/lib/entity-keys.ts";
import { apiFetch } from "@/shared/api-client.ts";
import {
  type BuilderPermissions,
  resolvePermissions,
} from "@/shared/permissions.ts";
import {
  mobListItemSchema,
  mobListSchema,
  mobSchema,
} from "@/shared/schemas/mob.ts";
import {
  objListItemSchema,
  objListSchema,
  objSchema,
} from "@/shared/schemas/obj.ts";
import {
  roomListItemSchema,
  roomListSchema,
  roomSchema,
} from "@/shared/schemas/room.ts";
import { useAuthStore } from "@/state/auth.ts";

export type ListEntityType = "mob" | "object" | "room";

export type RawItemFor<T extends ListEntityType> = T extends "mob"
  ? z.infer<typeof mobListItemSchema>
  : T extends "object"
    ? z.infer<typeof objListItemSchema>
    : T extends "room"
      ? z.infer<typeof roomListItemSchema>
      : never;

interface ListConfig<T> {
  apiPath: string;
  basePath: string;
  itemSchema: z.ZodType<{ vnum: number }>;
  label: string;
  listSchema: z.ZodType<T[]>;
  permissionKey: keyof BuilderPermissions;
  secondaryLabel: string | undefined;
}

const LIST_CONFIG: { [K in ListEntityType]: ListConfig<RawItemFor<K>> } = {
  mob: {
    apiPath: "/api/mobs",
    basePath: "/mobs",
    itemSchema: mobSchema,
    label: "Mobs",
    listSchema: mobListSchema,
    permissionKey: "canEditMobs",
    secondaryLabel: "Keywords",
  },
  object: {
    apiPath: "/api/objects",
    basePath: "/objects",
    itemSchema: objSchema,
    label: "Objects",
    listSchema: objListSchema,
    permissionKey: "canEditObjects",
    secondaryLabel: "Keywords",
  },
  room: {
    apiPath: "/api/rooms",
    basePath: "/rooms",
    itemSchema: roomSchema,
    label: "Rooms",
    listSchema: roomListSchema,
    permissionKey: "canEditRooms",
    secondaryLabel: undefined,
  },
};

export function useEntityListPage<T extends ListEntityType>(type: T) {
  const config: ListConfig<RawItemFor<T>> = LIST_CONFIG[type];
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isSenior = user?.isSenior ?? false;
  const blocks = user?.blocks ?? [];
  const playerId = user?.playerId ?? 0;
  const [ownerFilter, setOwnerFilter] = useOwnerFilter({
    isSenior,
    playerId,
    type,
  });

  const query = useQuery({
    queryFn: () =>
      apiFetch(
        `${LIST_CONFIG[type].apiPath}?owner=${ownerFilter}`,
        LIST_CONFIG[type].listSchema,
      ),
    queryKey: entityKeys.list(type, ownerFilter),
  });

  const [confirmVnums, setConfirmVnums] = useState<number[]>([]);

  const { createMutation, deleteMutation } = useEntityListMutations({
    apiPath: config.apiPath,
    createSchema: config.itemSchema,
    entityLabel: type,
    listQueryKey: entityKeys.all(type),
    onCreated: async (vnum) => {
      await navigate({ to: `${config.basePath}/${vnum}` });
    },
  });

  const canEdit =
    ownerFilter !== "all" &&
    resolvePermissions(user?.powers ?? [], isSenior)[config.permissionKey];

  return {
    blocks,
    canEdit,
    config,
    confirmVnums,
    createMutation,
    deleteMutation,
    isSenior,
    navigate,
    ownerFilter,
    playerId,
    query,
    setConfirmVnums,
    setOwnerFilter,
  };
}
