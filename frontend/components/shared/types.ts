export interface Column<T> {
  key: keyof T;
  label: string;
  width?: string;
  colSpan?: number;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface SortConfig<T> {
  field: keyof T | null;
  order: "asc" | "desc";
}

export interface TableConfig<T> {
  columns: Column<T>[];
  emptyStateTitle: string;
  emptyStateDescription: string;
  emptyStateButtonLabel: string;
  onEmptyStateClick?: () => void;
  searchFields: (keyof T)[];
  sortableFields?: (keyof T)[];
}
