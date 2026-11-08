"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-5 py-3 text-[12.5px] text-muted">
      <span className="tabular">
        {from}–{to} z {total.toLocaleString("pl-PL")}
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="icon" variant="ghost" className="size-8" aria-label="Poprzednia strona" disabled={page === 0} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
        </Button>
        <span className="tabular px-1">
          {page + 1} / {pageCount}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label="Następna strona"
          disabled={page >= pageCount - 1}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
