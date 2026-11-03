import { apiClient, liveFirst } from "../../services/apiClient";
import { clonePhase7Data } from "../../mocks/phase7MockData";

let store=clonePhase7Data();
const wait=(ms=150)=>new Promise(r=>setTimeout(r,ms));

export const usersApi={
  async list(params={}){
    return liveFirst(
      async () => {
        const {data}=await apiClient.get("/api/v1/crm/users",{params});return data;
      },
      async () => {
        await wait();
        const q=(params.search||"").toLowerCase();
        let rows=store.staff.filter(u=>`${u.name} ${u.email} ${u.phone} ${u.department} ${u.role}`.toLowerCase().includes(q));
        if(params.role&&params.role!=="all") {
          if (params.role === "staff") rows = rows.filter(u => u.role !== "customer");
          else rows = rows.filter(u => u.role === params.role);
        }
        if(params.status&&params.status!=="all") rows=rows.filter(u=>u.status===params.status);
        return {data:rows,meta:{total:rows.length,page:1,pageSize:rows.length}};
      }
    );
  },
  async getById(id){
    return liveFirst(
      async () => {
        const {data}=await apiClient.get(`/api/v1/crm/users/${id}`);return data;
      },
      async () => {
        await wait();const u=store.staff.find(x=>x.id===id);if(!u)throw new Error("User not found.");return structuredClone(u);
      }
    );
  },
  async create(payload){
    return liveFirst(
      async () => {
        const {data}=await apiClient.post("/api/v1/crm/users",payload);return data;
      },
      async () => {
        await wait();
        const user={id:`USR-${Date.now()}`,status:"active",createdAt:new Date().toISOString().slice(0,10),lastLogin:null,permissions:[],...payload};
        store.staff=[user,...store.staff];return structuredClone(user);
      }
    );
  },
  async update(id,payload){
    return liveFirst(
      async () => {
        const {data}=await apiClient.patch(`/api/v1/crm/users/${id}`,payload);return data;
      },
      async () => {
        await wait();let updated=null;
        store.staff=store.staff.map(x=>x.id===id?(updated={...x,...structuredClone(payload)},updated):x);
        if(!updated)throw new Error("User not found.");return structuredClone(updated);
      }
    );
  },
  async delete(id, permanent = false) {
    return liveFirst(
      async () => {
        const { data } = await apiClient.delete(`/api/v1/crm/users/${id}${permanent ? '?permanent=true' : ''}`);
        return data;
      },
      async () => {
        await wait();
        store.staff = store.staff.filter(u => u.id !== id && u._id !== id);
        return { success: true };
      }
    );
  },
  async updatePermissions(id,permissions){
    return this.update(id,{permissions});
  },
  async listRoles(){
    return liveFirst(
      async () => {
        const {data}=await apiClient.get("/api/v1/roles");return data;
      },
      async () => {
        await wait();return {data:structuredClone(store.roles)};
      }
    );
  },
  async updateRole(roleKey,payload){
    return liveFirst(
      async () => {
        const {data}=await apiClient.patch(`/api/v1/roles/${roleKey}`,payload);return data;
      },
      async () => {
        await wait();let updated=null;
        store.roles=store.roles.map(r=>r.key===roleKey?(updated={...r,...structuredClone(payload)},updated):r);
        if(!updated)throw new Error("Role not found.");return structuredClone(updated);
      }
    );
  },
  async getPermissionCatalog(){
    return liveFirst(
      async () => {
        const {data}=await apiClient.get("/api/v1/permissions");return data;
      },
      async () => {
        await wait();return {data:structuredClone(store.permissionCatalog)};
      }
    );
  },
  // POST /api/v1/crm/users — CRM-side user creation. Required for hotelier
  // accounts: `hotelId` must accompany role="hotelier" (see
  // FRONTEND_CRM_HOTEL_AND_HOTELIER_INTEGRATION_GUIDE.md #3.I).
  async createCrmUser(payload){
    const {data}=await apiClient.post("/api/v1/crm/users",payload);
    if(data?.success===false) throw new Error(data?.message||"Failed to create CRM user");
    return data;
  }
};
