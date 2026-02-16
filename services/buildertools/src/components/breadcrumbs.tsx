import { Link } from "@tanstack/react-router";

interface BreadcrumbItem {
  label: string;
  to?: string | undefined;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-sm text-zinc-400"
    >
      <ol className="flex items-center gap-1">
        {items.map((item, index) => (
          <li
            className="flex items-center gap-1"
            key={item.to ?? item.label}
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="text-zinc-600"
              >
                /
              </span>
            ) : null}
            {item.to ? (
              <Link
                className="hover:text-zinc-200"
                to={item.to}
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current="page"
                className="text-zinc-200"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
