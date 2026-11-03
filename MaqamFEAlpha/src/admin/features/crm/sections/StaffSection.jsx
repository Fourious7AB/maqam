import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { formatDate } from "../../../utils/formatDate";
import { crmApi } from "../crmApi";
import {
  PanelBar, ChipGroup, SearchInput, Pill, TableWrap, EmptyState,
  Field, inputClass, FormActions,
} from "../crmUi";
import AvatarUploadField from "../../../components/common/AvatarUploadField";

const roleOptions = [
  { value: "staff", label: "All Staff (Default)" },
  { value: "customer", label: "Customer" },
  { value: "sales_agent", label: "Sales Agent" },
  { value: "support_agent", label: "Support Agent" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
  { value: "hotelier", label: "Hotelier" },
  { value: "", label: "All Roles (incl. Customers)" },
];

const activeOptions = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const emptyCreate = {
  firstName: "", lastName: "", email: "", phone: "",
  password: "", role: "sales_agent", avatar: "",
};

export default function StaffSection() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("staff");
  const [isActive, setActive] = useState("true");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState(emptyCreate);
  const [saving, setSaving] = useState(false);

  const [editRow, setEditRow] = useState(null);
  const [edit, setEdit] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "", isActive: true, password: "", avatar: "" });

  const load = async (page = 1) => {
    try {
      setLoading(true);
      const result = await crmApi.listStaff({ role, isActive, page, limit: 20 });
      setRows(result.items);
      setMeta(result.meta);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Unable to load staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => load(1), 200);
    return () => window.clearTimeout(timer);
  }, [role, isActive]);

  const staffList = Array.isArray(rows) ? rows : [];
  const roleFiltered = staffList.filter((row) => {
    const r = (row.role || "").toLowerCase();
    if (role === "staff") return r !== "customer";
    if (role === "customer") return r === "customer";
    if (role && role !== "") return r === role.toLowerCase();
    return true;
  });
  const visible = search.trim()
    ? roleFiltered.filter((row) =>
        `${row.firstName || ""} ${row.lastName || ""} ${row.name || ""} ${row.email || ""} ${row.phone || ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : roleFiltered;

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!create.firstName.trim() || !create.email.trim() || !create.password.trim()) {
      toast.error("First name, email and password are required");
      return;
    }
    try {
      setSaving(true);
      await crmApi.createStaff({
        firstName: create.firstName.trim(),
        lastName: create.lastName.trim(),
        email: create.email.trim(),
        phone: create.phone.trim() || undefined,
        password: create.password,
        role: create.role,
        ...(create.avatar?.trim() ? { avatar: create.avatar.trim() } : {}),
      });
      toast.success("CRM staff created");
      setCreateOpen(false);
      setCreate(emptyCreate);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to create staff");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row) => {
    if (editRow?._id === row._id) {
      setEditRow(null);
      return;
    }
    setEditRow(row);
    setEdit({
      firstName: row.firstName || "",
      lastName: row.lastName || "",
      email: row.email || "",
      phone: row.phone || "",
      role: row.role || "",
      isActive: row.isActive !== false,
      password: "",
      avatar: row.avatar || "",
    });
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await crmApi.updateStaff(editRow._id, {
        firstName: edit.firstName,
        lastName: edit.lastName,
        email: edit.email,
        phone: edit.phone,
        role: edit.role,
        isActive: edit.isActive,
        avatar: edit.avatar || "",
        ...(edit.password ? { password: edit.password } : {}),
      });
      toast.success("Staff updated");
      setEditRow(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update staff");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${`${row.firstName} ${row.lastName}`.trim() || row._id}? The account is deactivated unless permanent delete is confirmed.`)) return;
    const permanent = window.confirm("Permanently delete from the database?\nOK = permanent, Cancel = deactivate only");
    try {
      await crmApi.deleteStaff(row._id, permanent);
      toast.success(permanent ? "Staff permanently deleted" : "Staff deactivated");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to delete staff");
    }
  };

  const goPage = (page) => {
    if (!meta || page < 1 || page > meta.totalPages) return;
    load(page);
  };

  return (
    <div className="space-y-3">
      <PanelBar
        title="Users & Staff"
        count={meta?.total}
        onRefresh={() => load(1)}
        onAdd={() => setCreateOpen(true)}
        addLabel="Add Staff"
      >
        <div className="flex flex-wrap items-center gap-3">
          <ChipGroup options={activeOptions} value={isActive} onChange={setActive} />
          <select className={`${inputClass} w-auto pr-8`} value={role} onChange={(e) => setRole(e.target.value)}>
            {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, phone…" />
        </div>
      </PanelBar>

      {loading ? (
        <LoadingSpinner />
      ) : visible.length ? (
        <>
          <TableWrap>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row._id || row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.avatar ? (
                          <img
                            src={row.avatar}
                            alt={row.firstName || "Staff"}
                            className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                            {([row.firstName?.[0], row.lastName?.[0]].filter(Boolean).join("").toUpperCase()) || "U"}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{[row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.name || "—"}</p>
                          <p className="text-xs text-slate-500">{row.createdBy ? "Invited staff" : "Account holder"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{row.email || "—"}</p>
                      <p className="text-xs text-slate-500">{row.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.role?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3"><Pill tone={row.isActive ? "green" : "slate"}>{row.isActive ? "Active" : "Inactive"}</Pill></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.lastLogin ? formatDate(row.lastLogin) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => openEdit(row)}>Update</Button>
                        {row.role !== "super_admin" && (
                          <Button variant="ghost" className="!px-3 !py-1.5 !text-xs !text-red-700" onClick={() => handleDelete(row)}>Delete</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          {meta?.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page - 1)}>Prev</Button>
              <span className="text-xs font-semibold text-slate-500">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => goPage(meta.page + 1)}>Next</Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState message="No staff match the selected filters." />
      )}

      {/* Create form */}
      {createOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="mb-4 text-sm font-bold text-slate-900">Add CRM Staff</h4>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="First Name *">
                <input className={inputClass} required placeholder="Tariq" value={create.firstName} onChange={(e) => setCreate({ ...create, firstName: e.target.value })} />
              </Field>
              <Field label="Last Name">
                <input className={inputClass} placeholder="Rahman" value={create.lastName} onChange={(e) => setCreate({ ...create, lastName: e.target.value })} />
              </Field>
              <Field label="Email *">
                <input type="email" className={inputClass} required placeholder="agent@maqamtravels.com" value={create.email} onChange={(e) => setCreate({ ...create, email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className={inputClass} placeholder="9876543210" value={create.phone} onChange={(e) => setCreate({ ...create, phone: e.target.value })} />
              </Field>
              <Field label="Password *">
                <input type="password" className={inputClass} required placeholder="SecurePass123" value={create.password} onChange={(e) => setCreate({ ...create, password: e.target.value })} />
              </Field>
              <Field label="Role">
                <select className={inputClass} value={create.role} onChange={(e) => setCreate({ ...create, role: e.target.value })}>
                  {roleOptions.filter((option) => option.value && option.value !== "customer").map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2 xl:col-span-4">
                <AvatarUploadField
                  value={create.avatar}
                  onChange={(url) => setCreate({ ...create, avatar: url })}
                  fallbackInitials={`${create.firstName?.[0] ?? ''}${create.lastName?.[0] ?? ''}`}
                  label="Staff Avatar"
                  helperText="Upload a photo (JPG, PNG, WebP) or paste an image link."
                />
              </div>
            </div>
            <FormActions onCancel={() => setCreateOpen(false)} saving={saving} label="Create Staff" />
          </form>
        </div>
      )}

      {/* Edit form */}
      {editRow && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="mb-4 text-sm font-bold text-slate-900">
            Update — {`${editRow.firstName} ${editRow.lastName}`.trim() || editRow._id}
          </h4>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="First Name">
                <input className={inputClass} value={edit.firstName} onChange={(e) => setEdit({ ...edit, firstName: e.target.value })} />
              </Field>
              <Field label="Last Name">
                <input className={inputClass} value={edit.lastName} onChange={(e) => setEdit({ ...edit, lastName: e.target.value })} />
              </Field>
              <Field label="Email">
                <input type="email" className={inputClass} value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className={inputClass} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
              </Field>
              <Field label="Role">
                <select className={inputClass} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                  {roleOptions.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="New Password (leave blank to keep)">
                <input type="password" className={inputClass} value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
              </Field>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={edit.isActive}
                    onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                  />
                  Active
                </label>
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <AvatarUploadField
                  value={edit.avatar}
                  onChange={(url) => setEdit({ ...edit, avatar: url })}
                  fallbackInitials={`${edit.firstName?.[0] ?? ''}${edit.lastName?.[0] ?? ''}`}
                  label="Staff Avatar"
                  helperText="Upload a photo (JPG, PNG, WebP) or paste an image link."
                />
              </div>
            </div>
            <FormActions onCancel={() => setEditRow(null)} saving={saving} label="Save Changes" />
          </form>
        </div>
      )}
    </div>
  );
}
