import { User, Phone, Mail, MapPin } from "lucide-react";
import { formatDate } from "../../utils/formatDate";

function calculateAge(dobString) {
  if (!dobString) return null;
  const birth = new Date(dobString);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export default function TravelerTable({ travelers = [] }) {
  if (!travelers || travelers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
        <User size={24} className="mx-auto mb-1.5 text-slate-400" />
        <p className="font-semibold text-slate-700 dark:text-slate-300">No saved traveler profiles</p>
        <p className="mt-0.5 text-slate-400">No companion or family profiles linked to this account yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-3.5 py-2.5 w-10">#</th>
              <th className="px-3.5 py-2.5">Passenger Details</th>
              <th className="px-3.5 py-2.5">Type & Gender</th>
              <th className="px-3.5 py-2.5">Birth Date / Age</th>
              <th className="px-3.5 py-2.5">Passport & Nationality</th>
              <th className="px-3.5 py-2.5">Contact & Residence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {travelers.map((t, index) => {
              const age = calculateAge(t.dateOfBirth || t.dob);
              const isDefault = Boolean(t.isDefault);
              const passportNum = t.passportNo || t.passport || "—";
              const expiryDate = t.passportExpiry ? formatDate(t.passportExpiry) : null;
              const formattedDob = t.dateOfBirth || t.dob ? formatDate(t.dateOfBirth || t.dob) : "—";

              const addressText = t.address
                ? [t.address.addressLine1, t.address.city, t.address.countryName || t.address.countryCode]
                    .filter(Boolean)
                    .join(", ")
                : null;

              const contactPhone = t.phone
                ? `${t.cellCountryCode ? t.cellCountryCode + " " : ""}${t.phone}`
                : null;

              return (
                <tr
                  key={t._id || t.id || index}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                >
                  {/* Index */}
                  <td className="px-3.5 py-2.5 text-slate-400 tabular-nums">
                    {index + 1}
                  </td>

                  {/* Name */}
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {t.fullName || [t.firstName, t.lastName].filter(Boolean).join(" ") || t.name || "Traveller"}
                      </span>
                      {isDefault && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          Primary
                        </span>
                      )}
                    </div>
                    {t.documentId && (
                      <p className="text-[11px] font-mono text-slate-400">Doc: {t.documentId}</p>
                    )}
                  </td>

                  {/* Type & Gender */}
                  <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{t.passengerType || "Adult"}</span>
                    <span className="text-slate-400 mx-1">•</span>
                    <span className="text-slate-500 capitalize">{t.gender || "—"}</span>
                  </td>

                  {/* DOB / Age */}
                  <td className="px-3.5 py-2.5 tabular-nums text-slate-700 dark:text-slate-300">
                    <span>{formattedDob}</span>
                    {age !== null && (
                      <span className="ml-1 text-slate-400">({age}y)</span>
                    )}
                  </td>

                  {/* Passport */}
                  <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300">
                    <div className="font-mono font-medium">{passportNum}</div>
                    <div className="text-[11px] text-slate-400">
                      <span>{t.nationality || t.passportIssueCountryCode || "—"}</span>
                      {expiryDate && <span> · Exp: {expiryDate}</span>}
                    </div>
                  </td>

                  {/* Contact & Address */}
                  <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400">
                    <div className="space-y-0.5 max-w-[220px]">
                      {contactPhone && (
                        <p className="flex items-center gap-1 truncate">
                          <Phone size={11} className="text-slate-400 flex-none" />
                          <span>{contactPhone}</span>
                        </p>
                      )}
                      {t.email && (
                        <p className="flex items-center gap-1 truncate">
                          <Mail size={11} className="text-slate-400 flex-none" />
                          <span className="truncate">{t.email}</span>
                        </p>
                      )}
                      {addressText && (
                        <p className="flex items-start gap-1 text-[11px] text-slate-400">
                          <MapPin size={11} className="mt-0.5 flex-none text-slate-400" />
                          <span className="truncate">{addressText}</span>
                        </p>
                      )}
                      {!contactPhone && !t.email && !addressText && <span>—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
