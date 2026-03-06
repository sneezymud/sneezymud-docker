export function sortIndicator(sorted: "asc" | "desc" | false): string {
  if (sorted === "asc") return " \u25B2";
  if (sorted === "desc") return " \u25BC";
  return "";
}
