import { apiClient, liveFirst } from "../../services/apiClient";
import { clonePhase7Data } from "../../mocks/phase7MockData";

let store=clonePhase7Data();
const wait=(ms=130)=>new Promise(r=>setTimeout(r,ms));

export const auditApi={
  async list(params={}){
    return liveFirst(
      async () => {
        const {data}=await apiClient.get("/api/v1/audit-logs",{params});return data;
      },
      async () => {
        await wait();
        const q=(params.search||"").toLowerCase();
        let rows=store.auditLogs.filter(x=>`${x.actor} ${x.action} ${x.entity} ${x.description}`.toLowerCase().includes(q));
        if(params.severity&&params.severity!=="all")rows=rows.filter(x=>x.severity===params.severity);
        return {data:rows};
      }
    );
  }
};
