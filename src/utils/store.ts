import type { Store } from "../types";

export function getStoreDisplayName(store: Store): string {
  return store.shortName?.trim() || store.name;
}
