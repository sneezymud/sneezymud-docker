export const roomKeys = {
  all: ["rooms"] as const,
  detail: (vnum: number) => [...roomKeys.all, "detail", vnum] as const,
  name: (vnum: number) => [...roomKeys.all, "name", vnum] as const,
  search: (search: string) => [...roomKeys.all, "search", search] as const,
};

export const mobKeys = {
  all: ["mobs"] as const,
  detail: (vnum: number) => [...mobKeys.all, "detail", vnum] as const,
  response: (vnum: number) => [...mobKeys.all, "response", vnum] as const,
};

export const objectKeys = {
  all: ["objects"] as const,
  detail: (vnum: number) => [...objectKeys.all, "detail", vnum] as const,
  search: (search: string) => [...objectKeys.all, "search", search] as const,
};

export const zoneKeys = {
  all: ["zones"] as const,
};
