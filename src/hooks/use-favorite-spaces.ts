"use client";

import { useCallback, useEffect, useState } from "react";

const FAVORITES_KEY = "ch360-favorite-spaces";

/**
 * Favorited space IDs, persisted to localStorage only. There is no
 * server-side favorites concept (no schema field for it, and this redesign
 * is presentation-layer only) — favorites are deliberately per-browser and
 * do not sync across devices or sessions.
 */
export function useFavoriteSpaces() {
  const [favorites, setFavorites] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      setFavorites(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setFavorites([]);
    }
  }, []);

  const toggleFavorite = useCallback((spaceId: string) => {
    setFavorites((prev) => {
      const current = prev ?? [];
      const next = current.includes(spaceId) ? current.filter((id) => id !== spaceId) : [...current, spaceId];
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // localStorage unavailable (private browsing, quota) — favorites just won't persist this session.
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((spaceId: string) => (favorites ?? []).includes(spaceId), [favorites]);

  return { favorites: favorites ?? [], isHydrated: favorites !== null, toggleFavorite, isFavorite };
}
