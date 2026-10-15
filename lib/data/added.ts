import { useSyncExternalStore } from "react";
import type { LibraryItem } from "@/lib/api-client";

// Collections added with "Agregar desde Spotify" that aren't in the person's Spotify library.
// The app can't write to Spotify (read-only scopes), so they live in this browser.

const KEY = "ci-added";
const listeners = new Set<() => void>();
let cache: LibraryItem[] | null = null;

function read(): LibraryItem[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: LibraryItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage blocked: keeps working for this session */
  }
  listeners.forEach((listener) => listener());
}

export function addCollection(item: LibraryItem) {
  const rest = read().filter((existing) => !(existing.kind === item.kind && existing.id === item.id));
  write([item, ...rest].slice(0, 100));
}

export function useAddedCollections(): LibraryItem[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    read,
  );
}

const LAST_KEY = "ci-last";

/** The collection to reopen on the next visit. */
export function rememberLastCollection(path: string) {
  try {
    localStorage.setItem(LAST_KEY, path);
  } catch {
    /* ignore */
  }
}

export function lastCollection(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
