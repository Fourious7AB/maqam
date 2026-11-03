import { useState, useEffect, useCallback } from "react";
import { fetchHeroPic } from "../services/cmsService";

// In-memory module cache to avoid redundant network requests across routes
let cachedHeroBanner = null;
let lastFetchedTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

/**
 * Custom React hook to fetch and synchronize active CMS Hero Banner.
 *
 * @returns {{
 *   heroBanner: Object|null,
 *   isLoading: boolean,
 *   error: any,
 *   refetch: () => Promise<void>
 * }}
 */
export function useHeroBanner() {
  const [heroBanner, setHeroBanner] = useState(cachedHeroBanner);
  const [isLoading, setIsLoading] = useState(!cachedHeroBanner);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchHeroPic();
      cachedHeroBanner = data;
      lastFetchedTime = Date.now();
      setHeroBanner(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const initialize = async () => {
      const now = Date.now();
      if (cachedHeroBanner && now - lastFetchedTime < CACHE_TTL_MS) {
        return;
      }

      try {
        const data = await fetchHeroPic();
        if (!ignore) {
          cachedHeroBanner = data;
          lastFetchedTime = Date.now();
          setHeroBanner(data);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err);
          setIsLoading(false);
        }
      }
    };

    initialize();

    // Listen to real-time administrative updates across the app
    const handleUpdate = (e) => {
      const updatedData = e?.detail ?? null;
      cachedHeroBanner = updatedData;
      lastFetchedTime = Date.now();
      setHeroBanner(updatedData);
      setIsLoading(false);
    };

    window.addEventListener("cms:hero-updated", handleUpdate);
    return () => {
      ignore = true;
      window.removeEventListener("cms:hero-updated", handleUpdate);
    };
  }, []);

  return {
    heroBanner,
    isLoading,
    error,
    refetch,
  };
}

export default useHeroBanner;
