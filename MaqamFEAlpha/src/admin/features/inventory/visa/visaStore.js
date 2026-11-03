import { create } from 'zustand';
import { visaApi } from './visaApi';

const emptyMeta = { total: 0, page: 1, limit: 10, totalPages: 0 };

export const useVisaStore = create((set, get) => ({
  dashboard: null,
  applications: [],
  applicationsMeta: emptyMeta,
  application: null,
  groups: [],
  groupsMeta: emptyMeta,
  group: null,
  caseOfficers: [],
  inventory: [],
  inventoryMeta: emptyMeta,
  inventoryDetail: null,
  filters: { inventory: { page: 1, limit: 10, country: '', visaType: '', status: '', search: '', includeDeleted: false } },
  loading: {},
  error: '',

  run: async (key, fn) => {
    set((state) => ({ loading: { ...state.loading, [key]: true }, error: '' }));
    try {
      return await fn();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Request failed';
      set({ error: message });
      throw error;
    } finally {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
    }
  },

  fetchDashboard: async () => get().run('dashboard', async () => {
    const dashboard = await visaApi.getDashboard();
    set({ dashboard });
    return dashboard;
  }),

  fetchApplications: async (params = {}) => get().run('applications', async () => {
    // Never render rows from a previous request: drop stale data the moment a
    // fresh fetch starts so the page shows its loading state instead.
    set({ applications: [], applicationsMeta: emptyMeta });
    const result = await visaApi.listApplications(params);
    set({ applications: result.data, applicationsMeta: result.meta });
    return result;
  }),

  fetchApplication: async (id) => get().run('application', async () => {
    set({ application: null });
    const application = await visaApi.getApplication(id);
    set({ application });
    return application;
  }),

  assignApplication: async (id, payload) => get().run('applicationMutation', async () => {
    const updated = await visaApi.assignApplication(id, payload);
    set((state) => ({ application: state.application?._id === id ? updated : state.application, applications: state.applications.map((item) => item._id === id ? { ...item, ...updated } : item) }));
    return updated;
  }),

  updateApplicationStatus: async (id, payload) => get().run('applicationMutation', async () => {
    const updated = await visaApi.updateApplicationStatus(id, payload);
    set((state) => ({ application: state.application?._id === id ? updated : state.application, applications: state.applications.map((item) => item._id === id ? { ...item, ...updated } : item) }));
    return updated;
  }),

  fetchGroups: async (params = {}) => get().run('groups', async () => {
    set({ groups: [], groupsMeta: emptyMeta });
    const result = await visaApi.listGroups(params);
    set({ groups: result.data, groupsMeta: result.meta });
    return result;
  }),

  fetchGroup: async (id) => get().run('group', async () => {
    set({ group: null });
    const group = await visaApi.getGroup(id);
    set({ group });
    return group;
  }),

  fetchCaseOfficers: async () => get().run('caseOfficers', async () => {
    const caseOfficers = await visaApi.listCaseOfficers();
    set({ caseOfficers });
    return caseOfficers;
  }),

  createCaseOfficer: async (payload) => get().run('caseOfficerMutation', async () => {
    const created = await visaApi.createCaseOfficer(payload);
    set((state) => ({ caseOfficers: [created, ...state.caseOfficers] }));
    return created;
  }),

  setInventoryFilters: (filters) => set((state) => ({ filters: { ...state.filters, inventory: { ...state.filters.inventory, ...filters } } })),

  fetchInventory: async (params = null) => get().run('inventory', async () => {
    const filters = params || get().filters.inventory;
    set((state) => ({ filters: { ...state.filters, inventory: { ...state.filters.inventory, ...filters } } }));
    set({ inventory: [], inventoryMeta: emptyMeta });
    const result = await visaApi.listInventory(filters);
    set({ inventory: result.data, inventoryMeta: result.meta });
    return result;
  }),

  fetchInventoryDetail: async (id) => get().run('inventoryDetail', async () => {
    set({ inventoryDetail: null });
    const detail = await visaApi.getInventory(id);
    set({ inventoryDetail: detail });
    return detail;
  }),

  createInventory: async (payload) => get().run('inventoryMutation', async () => {
    const created = await visaApi.createInventory(payload);
    set((state) => ({ inventory: [created, ...state.inventory], inventoryDetail: created }));
    return created;
  }),

  updateInventory: async (id, payload) => get().run('inventoryMutation', async () => {
    const updated = await visaApi.updateInventory(id, payload);
    set((state) => ({
      inventory: state.inventory.map((item) => item._id === id ? { ...item, ...updated } : item),
      inventoryDetail: state.inventoryDetail?._id === id ? updated : state.inventoryDetail,
    }));
    return updated;
  }),

  deleteInventory: async (id, permanent = false) => get().run('inventoryMutation', async () => {
    const result = await visaApi.deleteInventory(id, permanent);
    if (permanent) set((state) => ({ inventory: state.inventory.filter((item) => item._id !== id), inventoryDetail: state.inventoryDetail?._id === id ? null : state.inventoryDetail }));
    else set((state) => ({ inventory: state.inventory.map((item) => item._id === id ? { ...item, status: 'deleted', isDeleted: true, ...result } : item) }));
    return result;
  }),

  adjustStock: async (id, payload) => get().run('stockMutation', async () => {
    const result = await visaApi.adjustStock(id, payload);
    set((state) => ({ inventory: state.inventory.map((item) => item._id === id ? { ...item, ...result } : item), inventoryDetail: state.inventoryDetail?._id === id ? { ...state.inventoryDetail, ...result } : state.inventoryDetail }));
    return result;
  }),
}));
