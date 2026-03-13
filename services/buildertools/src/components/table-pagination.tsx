import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination.tsx";

export function TablePagination({
  canNextPage,
  canPreviousPage,
  onNextPage,
  onPreviousPage,
  pageIndex,
  totalPages,
}: {
  canNextPage: boolean;
  canPreviousPage: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  pageIndex: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className="mt-3">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            className="h-10 w-10"
            disabled={!canPreviousPage}
            onClick={onPreviousPage}
          />
        </PaginationItem>

        <PaginationItem>
          <span className="text-muted-foreground text-sm">
            Page {pageIndex + 1} of {totalPages}
          </span>
        </PaginationItem>

        <PaginationItem>
          <PaginationNext
            className="h-10 w-10"
            disabled={!canNextPage}
            onClick={onNextPage}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
