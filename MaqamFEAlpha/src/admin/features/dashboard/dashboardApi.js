import { apiClient, liveFirst } from "../../services/apiClient";
import { dashboardMock } from "../../mocks/mockData";

export const dashboardApi = {
  async getOverview(params = {}) {
    return liveFirst(
      async () => {
        const { data } = await apiClient.get("/api/v1/admin/dashboard/overview", { params });
        return data;
      },
      async () => {
        // When /api/v1/admin/dashboard/overview is not present (404),
        // gracefully bridge to the live verified /api/v1/crm/finance/overview endpoint
        // so live revenue metrics and charts are rendered with real numbers.
        try {
          const { data: finData } = await apiClient.get("/api/v1/crm/finance/overview");
          const finance = finData?.data || finData;
          if (finance && (finance.grossRevenue != null || finance.totalTransactions != null)) {
            const currentMonthName = new Date().toLocaleDateString("en-US", { month: "short" });
            const grossLakh = Number((Number(finance.grossRevenue || 0) / 100000).toFixed(1));
            return {
              ...dashboardMock,
              stats: (dashboardMock.stats || []).map((s) => {
                if (s.key === "revenue" && finance.grossRevenue != null) {
                  return { ...s, value: `₹${grossLakh}L` };
                }
                return s;
              }),
              revenue: (dashboardMock.revenue || []).map((r, i, arr) => {
                if (i === arr.length - 1 && grossLakh > 0) {
                  return { label: currentMonthName, value: grossLakh };
                }
                return r;
              }),
            };
          }
        } catch {
          // Keep mock fallback
        }
        return dashboardMock;
      }
    );
  },

  async getLeadSummary(params = {}) {
    return liveFirst(
      async () => {
        const { data } = await apiClient.get("/api/v1/admin/dashboard/leads", { params });
        return data;
      },
      async () => {
        // When /api/v1/admin/dashboard/leads is not present (404),
        // bridge to the live verified /api/v1/crm/pipeline endpoint.
        try {
          const { data: pipeData } = await apiClient.get("/api/v1/crm/pipeline");
          const p = pipeData?.data || pipeData;
          if (p && p.totalLeads != null) {
            const total = Number(p.totalLeads || 0);
            const won = Number(p.byStatus?.won || 0);
            const open = total - won - Number(p.byStatus?.lost || 0);
            return {
              total,
              open: Math.max(0, open),
              qualified: Number(p.byStatus?.qualified || 0),
              won,
              conversionRate: total > 0 ? Number(((won / total) * 100).toFixed(2)) : 0,
              ...params,
            };
          }
        } catch {
          // Fallback below
        }
        return { total: 48, open: 48, qualified: 18, won: 9, conversionRate: 18.75, ...params };
      }
    );
  },
};
