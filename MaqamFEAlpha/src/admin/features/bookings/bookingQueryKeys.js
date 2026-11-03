// Central TanStack Query keys + shared options for the bookings desk.
//
// Why: mutations must refresh only what they touched, and the desk must not
// re-request the same endpoints on remount, window focus or reconnect.
// Full browser refresh still fetches fresh data (an empty cache always
// fetches); returning to a page inside the cache window renders instantly.
//
// Roll-up rule: invalidating `bookingKeys.bookingsRoot()` refreshes the desk
// (summary + both list sources) but never the package catalogue, the customer
// index or the agent index.

export const bookingKeys = {
  bookingsRoot: () => ['crm', 'bookings'],
  summary: () => ['crm', 'bookings', 'summary'],
  list: (params = {}) => ['crm', 'bookings', 'list', params],
  masterIndex: (params = {}) => ['crm', 'bookings', 'master', params],
  packageList: (params = {}) => ['crm', 'bookings', 'package', params],
  detail: (id, bookingType = 'package') => ['crm', 'bookings', 'detail', bookingType, id],
  dossier: (bookingType, id) => ['crm', 'bookings', 'dossier', bookingType || 'package', id],
  packageCatalog: (params = {}) => ['crm', 'packages', 'catalog', params],
  customerIndex: () => ['crm', 'customers', 'index'],
  agentList: () => ['crm', 'agents', 'index'],
  agentIndex: () => ['crm', 'agents', 'index'],
  leadIndex: () => ['crm', 'leads', 'index'],
};

// Operational data: keep it fresh-ish without hammering the backend.
export const OPERATIONAL_QUERY_OPTIONS = {
  staleTime: 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
  retry: 1,
};

// Reference data (package catalogue, customer/agent indexes) changes rarely.
export const REFERENCE_QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
  retry: 1,
};

// A single row of truth for "which list queries does a booking mutation
// touch?" so create/update/assign/remark/cancel refresh only those.
export const invalidateBookingData = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: bookingKeys.bookingsRoot() });
};
