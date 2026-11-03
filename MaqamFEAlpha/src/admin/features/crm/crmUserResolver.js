import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// Global in-memory cache for CRM users
const userCache = new Map();
const pendingRequests = new Map();
const subscribers = new Set();

const notifySubscribers = () => {
  subscribers.forEach((callback) => {
    try {
      callback();
    } catch {
      // Ignore listener error
    }
  });
};

export const extractUserId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    return String(value.$oid ?? value._id ?? value.id ?? "").trim();
  }
  return String(value).trim();
};

export const formatUserName = (user) => {
  if (!user) return "Customer";
  if (typeof user === "string") return user;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.name || user.fullName || user.phone || user.email || "Customer";
};

export const getCachedCrmUser = (userIdOrObject) => {
  if (!userIdOrObject) return null;
  const id = extractUserId(userIdOrObject);
  if (!id) return null;
  return userCache.get(id) || null;
};

/**
 * Resolves a single CRM user via GET /api/v1/crm/users/:id.
 * Deduplicates in-flight requests and caches result in memory.
 */
export const resolveCrmUser = async (userIdOrObject) => {
  if (!userIdOrObject) return null;

  // If already populated with user details (e.g. firstName or name)
  if (
    typeof userIdOrObject === "object" &&
    userIdOrObject !== null &&
    (userIdOrObject.firstName || userIdOrObject.name || userIdOrObject.email)
  ) {
    const id = extractUserId(userIdOrObject);
    const resolved = {
      id: id || "",
      name: formatUserName(userIdOrObject),
      firstName: userIdOrObject.firstName || "",
      lastName: userIdOrObject.lastName || "",
      email: userIdOrObject.email || "",
      phone: userIdOrObject.phone || "",
      role: userIdOrObject.role || "customer",
      avatar: userIdOrObject.avatar || "",
    };
    if (id) {
      userCache.set(id, resolved);
    }
    return resolved;
  }

  const id = extractUserId(userIdOrObject);
  if (!id || !OBJECT_ID_REGEX.test(id)) return null;

  // Return cached result if present
  if (userCache.has(id)) {
    return userCache.get(id);
  }

  // Join in-flight request if present
  if (pendingRequests.has(id)) {
    return pendingRequests.get(id);
  }

  const requestPromise = (async () => {
    try {
      const response = await apiClient.get(`/api/v1/crm/users/${id}`);
      const raw = response?.data?.data ?? response?.data ?? {};
      const resolved = {
        id,
        name: formatUserName(raw),
        firstName: raw.firstName || "",
        lastName: raw.lastName || "",
        email: raw.email || "",
        phone: raw.phone || "",
        role: raw.role || "customer",
        avatar: raw.avatar || "",
        raw,
      };
      userCache.set(id, resolved);
      notifySubscribers();
      return resolved;
    } catch {
      // Record fallback on failure to avoid continuous spam
      const fallback = {
        id,
        name: "Customer",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "customer",
        avatar: "",
      };
      userCache.set(id, fallback);
      return fallback;
    } finally {
      pendingRequests.delete(id);
    }
  })();

  pendingRequests.set(id, requestPromise);
  return requestPromise;
};

/**
 * Pre-fetches CRM users for an array of items (e.g. bookings).
 */
export const resolveUsersForList = async (items = [], getUserIdFn) => {
  if (!Array.isArray(items) || items.length === 0) return;

  const userIds = new Set();
  items.forEach((item) => {
    const val = getUserIdFn ? getUserIdFn(item) : item?.userId ?? item?.customer ?? item?.customerId ?? item?.user;
    const id = extractUserId(val);
    if (id && OBJECT_ID_REGEX.test(id) && !userCache.has(id)) {
      userIds.add(id);
    }
  });

  if (userIds.size === 0) return;

  await Promise.allSettled(Array.from(userIds).map((id) => resolveCrmUser(id)));
};

/**
 * React hook to retrieve a user by ID.
 * Returns { user, name, email, phone, loading }.
 */
export function useCrmUser(userIdOrObject) {
  const id = extractUserId(userIdOrObject);
  const [user, setUser] = useState(() => getCachedCrmUser(id));
  const [loading, setLoading] = useState(() => Boolean(id && !userCache.has(id)));

  useEffect(() => {
    if (!id || !OBJECT_ID_REGEX.test(id)) {
      setUser(null);
      setLoading(false);
      return;
    }

    const cached = userCache.get(id);
    if (cached) {
      setUser(cached);
      setLoading(false);
    } else {
      setLoading(true);
      resolveCrmUser(id).then((res) => {
        setUser(res);
        setLoading(false);
      });
    }

    const onUpdate = () => {
      const fresh = userCache.get(id);
      if (fresh) setUser(fresh);
    };

    subscribers.add(onUpdate);
    return () => subscribers.delete(onUpdate);
  }, [id]);

  return {
    user,
    name: user?.name || "Customer",
    email: user?.email || "",
    phone: user?.phone || "",
    role: user?.role || "",
    loading,
  };
}

/**
 * React hook to observe multiple users (e.g. for a table or card list).
 */
export function useCrmUserMap(items = [], getUserIdFn) {
  const [, setVersion] = useState(0);

  useEffect(() => {
    resolveUsersForList(items, getUserIdFn);

    const onUpdate = () => setVersion((v) => v + 1);
    subscribers.add(onUpdate);
    return () => subscribers.delete(onUpdate);
  }, [items, getUserIdFn]);

  return {
    getUser: (userIdOrObject) => {
      const id = extractUserId(userIdOrObject);
      return userCache.get(id) || null;
    },
    getName: (userIdOrObject, fallback = "Customer") => {
      const id = extractUserId(userIdOrObject);
      const u = userCache.get(id);
      return u?.name || fallback;
    },
    getEmail: (userIdOrObject) => {
      const id = extractUserId(userIdOrObject);
      const u = userCache.get(id);
      return u?.email || "";
    },
    getPhone: (userIdOrObject) => {
      const id = extractUserId(userIdOrObject);
      const u = userCache.get(id);
      return u?.phone || "";
    },
  };
}
