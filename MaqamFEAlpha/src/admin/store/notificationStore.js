import { create } from 'zustand';

const MAX_ITEMS = 30;

// Tracks snapshot-section changes ("Booking approvals: 12 → 15") so the
// header bell can show how many notifications are unviewed. Deliberately NOT
// persisted: CRM metric snapshots are refetched live on every dashboard load,
// so nothing stale is kept across reloads.
export const useNotificationStore = create((set) => ({
      items: [],
      lastValues: {},

      pushMetricChange: (section, label, from, to, link) => set((state) => ({
        items: [
          {
            id: `${section}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            section,
            label,
            from,
            to,
            link: link || null,
            at: Date.now(),
            read: false,
          },
          ...state.items,
        ].slice(0, MAX_ITEMS),
      })),

      setLastValue: (key, value) => set((state) => ({ lastValues: { ...state.lastValues, [key]: value } })),

      markRead: (id) => set((state) => ({ items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)) })),

      // Viewing a notification consumes it: removed from the list entirely.
      removeNotification: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

      markAllRead: () => set((state) => ({ items: state.items.map((item) => ({ ...item, read: true })) })),

      clearAll: () => set({ items: [] }),
}));

export const unreadNotificationCount = (items) => items.filter((item) => !item.read).length;
