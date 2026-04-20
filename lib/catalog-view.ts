export type CatalogViewMode = "all" | "my";

export const CATALOG_VIEW_STORAGE_KEY = "beervana:catalog-view";
export const CATALOG_VIEW_EVENT = "beervana:catalog-view-change";

export function normalizeCatalogViewMode(value: unknown): CatalogViewMode {
  return value === "my" ? "my" : "all";
}
