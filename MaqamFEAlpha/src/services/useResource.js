// -----------------------------------------------------------------------------
// useResource — one hook that powers every admin list page.
//
// • No VITE_API_URL configured  -> pure local mock (the `initialData` you pass),
//   with create/update/delete mutating in-memory state. Zero network calls.
// • VITE_API_URL configured      -> GET the list on mount, and POST/PUT/DELETE
//   against `${VITE_API_URL}${endpoint}` on every mutation.
//
// If a live GET fails (backend down / wrong URL), it degrades gracefully: it
// shows the mock data and a toast, so the route still renders instead of
// crashing. This makes "every route works" true in both modes.
// -----------------------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  isApiEnabled,
  unwrapItem,
  unwrapList,
} from "./http";

export function useResource({
  endpoint,
  initialData = [],
  idKey = "id",
  makeId,
  entityName = "record",
}) {
  // Live mode only when a backend URL exists AND this page declared an endpoint.
  const apiMode = isApiEnabled() && Boolean(endpoint);

  const [rows, setRows] = useState(initialData);
  const [loading, setLoading] = useState(apiMode);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!apiMode) {
      setRows(initialData);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await apiGet(endpoint);
      if (!mounted.current) return;
      setRows(unwrapList(payload));
    } catch (err) {
      if (!mounted.current) return;
      setError(err);
      setRows(initialData); // graceful fallback so the page still renders
      toast.error(
        `Couldn't reach the server for ${entityName}s — showing sample data.`
      );
    } finally {
      if (mounted.current) setLoading(false);
    }
    // initialData is intentionally excluded: it's a module-level constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiMode, endpoint, entityName]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (values) => {
      if (apiMode) {
        const created = unwrapItem(await apiPost(endpoint, values));
        const row =
          created && created[idKey] != null
            ? created
            : { [idKey]: makeId ? makeId(rows) : Date.now(), ...values, ...(created || {}) };
        setRows((prev) => [row, ...prev]);
        return row;
      }
      const row = {
        [idKey]: makeId ? makeId(rows) : String(Date.now()),
        ...values,
      };
      setRows((prev) => [row, ...prev]);
      return row;
    },
    [apiMode, endpoint, idKey, makeId, rows]
  );

  const update = useCallback(
    async (id, values) => {
      if (apiMode) {
        const updated = unwrapItem(await apiPut(`${endpoint}/${id}`, values));
        setRows((prev) =>
          prev.map((r) =>
            r[idKey] === id ? { ...r, ...values, ...(updated || {}) } : r
          )
        );
        return updated;
      }
      setRows((prev) =>
        prev.map((r) => (r[idKey] === id ? { ...r, ...values } : r))
      );
      return null;
    },
    [apiMode, endpoint, idKey]
  );

  const remove = useCallback(
    async (id) => {
      if (apiMode) {
        await apiDelete(`${endpoint}/${id}`);
      }
      setRows((prev) => prev.filter((r) => r[idKey] !== id));
    },
    [apiMode, endpoint, idKey]
  );

  return {
    rows,
    setRows,
    loading,
    error,
    apiMode,
    reload: load,
    create,
    update,
    remove,
  };
}
