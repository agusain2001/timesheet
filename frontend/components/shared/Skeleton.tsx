"use client";

/**
 * Skeleton Loader - Animated placeholder for loading states
 * Used while data is being fetched
 */

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = "", count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-foreground/10 dark:bg-foreground/20 rounded ${className}`}
        />
      ))}
    </>
  );
}

/**
 * Table Row Skeleton - Loading placeholder for table rows
 */
export function TableRowSkeleton({
  columnCount = 4,
}: {
  columnCount?: number;
}) {
  return (
    <div
      className="grid gap-4 p-4 border-b"
      style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
    >
      {Array.from({ length: columnCount }).map((_, i) => (
        <Skeleton key={i} className="h-6" />
      ))}
    </div>
  );
}

/**
 * Table Skeleton - Multiple loading rows
 */
export function TableSkeleton({
  rowCount = 5,
  columnCount = 4,
}: {
  rowCount?: number;
  columnCount?: number;
}) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rowCount }).map((_, i) => (
        <TableRowSkeleton key={i} columnCount={columnCount} />
      ))}
    </div>
  );
}

/**
 * Card Skeleton - Loading placeholder for card layouts
 */
export function CardSkeleton() {
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-10 w-24 mt-4" />
    </div>
  );
}
