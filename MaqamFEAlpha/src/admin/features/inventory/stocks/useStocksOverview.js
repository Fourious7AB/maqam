import { useQuery } from "@tanstack/react-query";

import { stocksApi } from "./stocksApi";

// Consolidated stock metrics.
// Fresh on every mount (gcTime 0 globally): page refresh, route change, or
// re-entering the page always refetches; focus/reconnect refetch too.
// Polled every 15s while the tab is visible (pauses when the tab is hidden
// so it never spams the network in the background).
export function useStocksOverview() {
  return useQuery({
    queryKey: ["stocks", "overview"],
    queryFn: () => stocksApi.getOverview(),
    refetchInterval: 15_000,
  });
}
