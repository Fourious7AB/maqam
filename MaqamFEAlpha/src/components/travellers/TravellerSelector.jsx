import React, { useState, useEffect } from "react";
import { Users, UserPlus, Check, Sparkles, Loader2, UserCheck, Shield } from "lucide-react";
import travellerService from "../../services/travellerService";
import { toast } from "react-toastify";

/**
 * Reusable TravellerSelector component for 1-click autofill from saved profiles.
 * Used during flight checkout, hotel checkout, and package booking.
 *
 * @param {Object} props
 * @param {Function} props.onSelect - Callback when a traveller is selected: (traveller) => void
 * @param {string} [props.selectedId] - Currently selected traveller ID
 * @param {string} [props.filterType] - Optional filter: "Adult" | "Child" | "Infant" | "all"
 * @param {string} [props.title] - Custom section heading
 */
export const TravellerSelector = ({
  onSelect,
  selectedId = null,
  filterType = "all",
  title = "Select from Saved Co-Travellers",
}) => {
  const [travellers, setTravellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Add Traveller Modal Form State
  const [newTraveller, setNewTraveller] = useState({
    title: "Mr",
    firstName: "",
    lastName: "",
    passengerType: filterType !== "all" ? filterType : "Adult",
    gender: "Male",
    dateOfBirth: "1995-05-15",
    cellCountryCode: "+91",
    email: "",
    phone: "",
    pan: "",
    passportNo: "",
    passportExpiry: "",
  });

  useEffect(() => {
    let isMounted = true;
    const loadTravellers = async () => {
      try {
        setLoading(true);
        const list = await travellerService.getAllTravellers();
        if (isMounted) {
          setTravellers(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.warn("Could not load saved travellers:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadTravellers();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTravellers = travellers.filter((t) => {
    if (filterType === "all") return true;
    return (t.passengerType || "Adult").toLowerCase() === filterType.toLowerCase();
  });

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!newTraveller.firstName.trim() || !newTraveller.lastName.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    const cleanEmail = newTraveller.email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("A valid email address is required.");
      return;
    }
    const cleanPhone = String(newTraveller.phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15) {
      toast.error("A valid phone number (7-15 digits) is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const dob = newTraveller.dateOfBirth
        ? new Date(newTraveller.dateOfBirth).toISOString()
        : new Date("1995-05-15").toISOString();

      const payload = {
        title: newTraveller.title,
        firstName: newTraveller.firstName.trim(),
        lastName: newTraveller.lastName.trim(),
        passengerType: newTraveller.passengerType || "Adult",
        gender:
          newTraveller.gender ||
          (["Mr", "Mstr"].includes(newTraveller.title) ? "Male" : "Female"),
        dateOfBirth: dob,
        email: cleanEmail.toLowerCase(),
        phone: cleanPhone,
        cellCountryCode: newTraveller.cellCountryCode || "+91",
      };

      if (newTraveller.pan?.trim()) {
        payload.pan = newTraveller.pan.trim().toUpperCase();
      }
      if (newTraveller.passportNo?.trim()) {
        payload.passportNo = newTraveller.passportNo.trim().toUpperCase();
      }
      if (newTraveller.passportExpiry) {
        payload.passportExpiry = new Date(newTraveller.passportExpiry).toISOString();
      }

      const created = await travellerService.createTraveller(payload);
      toast.success("Traveller profile saved!");
      setTravellers((prev) => [created, ...prev]);
      setShowAddModal(false);
      if (onSelect) onSelect(created);
    } catch (err) {
      console.error("Failed to create traveller:", err);
      toast.error(err.response?.data?.message || "Failed to save traveller.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-xs text-slate-500">
        <Loader2 size={14} className="animate-spin text-teal-600" />
        <span>Loading saved traveller profiles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
          <Users size={14} className="text-teal-600" />
          <span>{title}</span>
        </label>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="text-[11px] font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer hover:underline"
        >
          <UserPlus size={12} />
          <span>+ Add Profile</span>
        </button>
      </div>

      {filteredTravellers.length === 0 ? (
        <div className="p-3 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500">
            No saved travellers found for this category.
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-1 text-xs font-bold text-teal-700 hover:underline cursor-pointer"
          >
            Save your profile for 1-click checkout
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filteredTravellers.map((trav) => {
            const id = trav._id || trav.id;
            const isSelected = selectedId === id;
            const name = `${trav.title ? trav.title + " " : ""}${trav.firstName} ${trav.lastName}`;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect && onSelect(trav)}
                className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-teal-700 text-white border-teal-700 shadow-xs font-bold"
                    : "bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50"
                }`}
              >
                {isSelected ? <Check size={12} /> : <UserCheck size={12} className="text-teal-600" />}
                <span className="truncate max-w-[160px]">{name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md uppercase font-black ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {trav.passengerType || "Adult"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Quick Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus size={16} className="text-teal-600" />
                <span>Save New Co-Traveller Profile</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Title
                  </label>
                  <select
                    value={newTraveller.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      const gen = ["Mr", "Mstr"].includes(val) ? "Male" : "Female";
                      setNewTraveller({ ...newTraveller, title: val, gender: gen });
                    }}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  >
                    <option value="Mr">Mr.</option>
                    <option value="Mrs">Mrs.</option>
                    <option value="Ms">Ms.</option>
                    <option value="Miss">Miss</option>
                    <option value="Mstr">Mstr</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTraveller.firstName}
                    onChange={(e) =>
                      setNewTraveller({ ...newTraveller, firstName: e.target.value })
                    }
                    placeholder="First Name"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTraveller.lastName}
                    onChange={(e) =>
                      setNewTraveller({ ...newTraveller, lastName: e.target.value })
                    }
                    placeholder="Last Name"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={newTraveller.dateOfBirth}
                    onChange={(e) =>
                      setNewTraveller({ ...newTraveller, dateOfBirth: e.target.value })
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Category
                  </label>
                  <select
                    value={newTraveller.passengerType}
                    onChange={(e) =>
                      setNewTraveller({ ...newTraveller, passengerType: e.target.value })
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  >
                    <option value="Adult">Adult (12+ yrs)</option>
                    <option value="Child">Child (2-11 yrs)</option>
                    <option value="Infant">Infant (0-2 yrs)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Gender
                  </label>
                  <select
                    value={newTraveller.gender}
                    onChange={(e) =>
                      setNewTraveller({ ...newTraveller, gender: e.target.value })
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newTraveller.email}
                    onChange={(e) =>
                      setNewTraveller({ ...newTraveller, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Mobile Phone *
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={newTraveller.cellCountryCode || "+91"}
                      onChange={(e) =>
                        setNewTraveller({
                          ...newTraveller,
                          cellCountryCode: e.target.value,
                        })
                      }
                      className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium shrink-0 max-w-[85px]"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+966">+966 (SA)</option>
                      <option value="+971">+971 (AE)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+965">+965 (KW)</option>
                      <option value="+974">+974 (QA)</option>
                    </select>
                    <input
                      type="tel"
                      required
                      value={newTraveller.phone}
                      onChange={(e) =>
                        setNewTraveller({ ...newTraveller, phone: e.target.value })
                      }
                      placeholder="9876543210"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    PAN Card (Hotel/Domestic)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={newTraveller.pan || ""}
                    onChange={(e) =>
                      setNewTraveller({
                        ...newTraveller,
                        pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                      })
                    }
                    placeholder="ABCDE1234F"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Passport No (Intl)
                  </label>
                  <input
                    type="text"
                    value={newTraveller.passportNo}
                    onChange={(e) =>
                      setNewTraveller({ ...newTraveller, passportNo: e.target.value.toUpperCase() })
                    }
                    placeholder="Z1234567"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Passport Expiry
                </label>
                <input
                  type="date"
                  value={newTraveller.passportExpiry}
                  onChange={(e) =>
                    setNewTraveller({ ...newTraveller, passportExpiry: e.target.value })
                  }
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                  <span>Save & Select</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravellerSelector;
