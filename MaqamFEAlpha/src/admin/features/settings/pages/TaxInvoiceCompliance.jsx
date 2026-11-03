import { useState } from 'react';
import {
  Receipt,
  Plane,
  Hotel,
  Package,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  Calculator,
} from 'lucide-react';
import SettingsHeader from '../components/SettingsHeader';
import SettingsCard from '../components/SettingsCard';

export default function TaxInvoiceCompliance() {
  const [activeTab, setActiveTab] = useState('flights');

  return (
    <div className="space-y-6 animate-slide-in">
      <SettingsHeader
        title="Tax & Invoice Compliance Engine"
        subtitle="Master SAC codes, statutory tax itemization rules, and automated invoice calculation reference for Flights, Hotels, and Tour Packages."
      />

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Plane size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">Flight Bookings</div>
              <div className="text-base font-black text-slate-900 dark:text-white">18% GST on Markup</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Wholesale airfare is pass-through (SAC 996411/12). 18% GST is levied strictly on commercial markup (SAC 998555).
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <Hotel size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">Hotel Bookings</div>
              <div className="text-base font-black text-slate-900 dark:text-white">18% GST on Fee</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Room tariff is pass-through (SAC 996311). 18% GST is levied strictly on agency service/convenience fee (SAC 998555).
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100/60 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Package size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">Umrah &amp; Tour Packages</div>
              <div className="text-base font-black text-emerald-700 dark:text-emerald-400">5% Personal GST</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            All-inclusive composite tour package (SAC 998555). Single uniform 5% Personal GST row without split CGST/SGST.
          </p>
        </div>
      </div>

      {/* Master SAC Code Matrix Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Master Statutory SAC &amp; Tax Matrix
            </h3>
            <p className="text-xs text-slate-400">Official statutory classification codes &amp; tax rules</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Service Vertical</th>
                <th className="py-3 px-4">Markup Origin</th>
                <th className="py-3 px-4">Tax Base Amount</th>
                <th className="py-3 px-4">GST Rate</th>
                <th className="py-3 px-4">Tax Line Presentation</th>
                <th className="py-3 px-4">Statutory SAC Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plane size={14} className="text-emerald-600" /> Flights
                </td>
                <td className="py-3.5 px-4">flightMarkupPercent (e.g. 2.5%)</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-600">Markup Amount Only</td>
                <td className="py-3.5 px-4 font-bold">18%</td>
                <td className="py-3.5 px-4">CGST 9% + SGST 9% (or IGST 18%)</td>
                <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                  998555 / 996411
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Hotel size={14} className="text-teal-600" /> Hotels
                </td>
                <td className="py-3.5 px-4">hotelMarkupPercent (e.g. 5.0%)</td>
                <td className="py-3.5 px-4 font-semibold text-teal-600">Service Fee + Markup Only</td>
                <td className="py-3.5 px-4 font-bold">18%</td>
                <td className="py-3.5 px-4">CGST 9% + SGST 9% (or IGST 18%)</td>
                <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                  998555 / 996311
                </td>
              </tr>
              <tr className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 bg-emerald-50/20">
                <td className="py-3.5 px-4 font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <Package size={14} className="text-emerald-600" /> Umrah &amp; Tour Packages
                </td>
                <td className="py-3.5 px-4">Fixed Itinerary Tariff + Add-ons</td>
                <td className="py-3.5 px-4 font-semibold text-emerald-700 dark:text-emerald-400">Total Booking Amount</td>
                <td className="py-3.5 px-4 font-extrabold text-emerald-700 dark:text-emerald-400">5.0%</td>
                <td className="py-3.5 px-4 font-bold text-emerald-700 dark:text-emerald-400">
                  Single "Agency Personal GST (5%)" Row (No Split)
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  998555
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quality Assurance Checklist */}
      <SettingsCard
        title="Statutory Audit & Invoice Quality Assurance"
        description="Verify compliance across customer invoices and automated PDF generation."
        icon={ShieldCheck}
      >
        <div className="grid gap-3.5 sm:grid-cols-2 text-xs">
          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-900 dark:text-white mb-0.5">No Double Taxation on Pass-Through Fares</strong>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Wholesale airfare and net room tariffs are pass-through supplier costs. 18% GST is never calculated against wholesale base costs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-900 dark:text-white mb-0.5">Package Tax Isolation (Clean 5%)</strong>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                In-house Umrah and tourism packages render exclusively the single "Agency Personal GST (5%)" row without confusing split CGST/SGST lines.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-900 dark:text-white mb-0.5">Statutory Agency Identifiers</strong>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Every executive A4 invoice header includes official trade name, registered address, 15-character GSTIN, PAN, and valid SAC classification.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-900 dark:text-white mb-0.5">Real-Time Rate Propagation</strong>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Updating markups or personal GST rates in settings immediately updates all newly booked reservation invoices and checkout totals.
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
