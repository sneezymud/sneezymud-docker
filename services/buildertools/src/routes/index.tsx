import { createFileRoute, redirect } from "@tanstack/react-router";

const VALID_SECTIONS = new Set(["/mobs", "/objects", "/rooms", "/zones"]);
const STORAGE_KEY = "bt-last-section";

export function saveLastSection(path: string): void {
  const section = `/${path.split("/")[1] ?? ""}`;
  if (VALID_SECTIONS.has(section)) {
    try {
      localStorage.setItem(STORAGE_KEY, section);
    } catch {
      // localStorage may be unavailable
    }
  }
}

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    let target = "/rooms";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && VALID_SECTIONS.has(saved)) {
        target = saved;
      }
    } catch {
      // localStorage may be unavailable
    }
    throw redirect({ to: target });
  },
});
