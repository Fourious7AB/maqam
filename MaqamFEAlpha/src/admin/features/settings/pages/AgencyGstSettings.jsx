import { useEffect, useState } from 'react';
import {
  Percent,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  Zap,
  Package,
  Layers,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import SettingsHeader from '../components/SettingsHeader';
import SettingsCard from '../components/SettingsCard';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import { settingsApi, DEFAULT_SETTINGS } from '../settingsApi';
import { useAuthStore } from '../../../store/authStore';

export default function AgencyGstSettings() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [gstData, setGstData] = useState(DEFAULT_SETTINGS.agencyGst);
  const [rateInput, setRateInput] = useState('5');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await settingsApi.getAgencyGst();
        if (isMounted && data) {
          setGstData(data);
          setRateInput(String(data.agencyPersonalGst ?? 5));
        }
      } catch {
        toast.error('Failed to load Agency GST settings');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApplyGst = async (overrideRate) => {
    if (!isAdmin) {
      toast.error('Permission denied: Only Administrators can apply taxation policies');
      return;
    }
    try {
      setApplying(true);
      const targetRate = overrideRate !== undefined ? overrideRate : (Number(rateInput) || 5);
      const result = await settingsApi.applyAgencyGst(targetRate);
      setGstData(result);
      setRateInput(String(result.agencyPersonalGst));
      toast.success(
        `Agency Personal GST (${result.agencyPersonalGst}%) applied successfully! Legacy split taxes deactivated.`
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to apply Agency Personal GST');
    } finally {
      setApplying(false);
    }
  };

  const isApplied = Boolean(gstData.isPersonalGstApplied);
  const currentRate = Number(gstData.agencyPersonalGst) || 5;

  // Sample Package Math for Simulation
  const samplePackagePrice = 100000;
  const sampleGstAmount = (samplePackagePrice * currentRate) / 100;
  const sampleTotalPaid = samplePackagePrice + sampleGstAmount;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <SettingsHeader
        title="Agency Personal GST (5%) & Package Taxation"
        subtitle="Manage the dedicated 5% Agency Personal GST taxation rule for In-House Tour and Umrah Packages. Strips legacy split taxes to guarantee clean, compliant invoicing."
      />

      {/* Primary Status Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 transition-all ${
          isApplied
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-emerald-50/90 dark:border-emerald-800/50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-emerald-950/40'
            : 'border-amber-200 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-amber-50/90 dark:border-amber-800/50 dark:from-amber-950/40 dark:to-amber-950/20'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  isApplied
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-amber-500 text-white shadow-xs'
                }`}
              >
                {isApplied ? (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Active ({currentRate}% Agency GST)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={13} />
                    <span>Not Applied</span>
                  </>
                )}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                SAC Classification 998555
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Exclusive Agency Personal GST Architecture
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              When activated, in-house pilgrimage packages and tour invoices exclusively charge the single uniform{' '}
              <strong>{currentRate}% Personal GST</strong>. Legacy split taxes (CGST 9% + SGST 9%) and conflicting default taxes are automatically deactivated.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {isAdmin && (
              <Button
                variant={isApplied ? 'secondary' : 'primary'}
                className="shadow-sm"
                onClick={() => handleApplyGst(5)}
                disabled={applying}
              >
                <Zap size={16} />
                <span>{applying ? 'Applying Policy…' : 'Apply 5% Personal GST'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Tax Configuration Controls */}
        <div className="space-y-6 lg:col-span-7">
          <SettingsCard
            title="Tax Rate Configuration"
            description="Adjust the exact statutory tax percentage applied to in-house package bookings."
            icon={Percent}
          >
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-full sm:w-48">
                  <Input
                    label="Personal GST Percentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    disabled={!isAdmin}
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    icon={Percent}
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 self-end pb-2.5">
                  Standard statutory rate for tour operators is <strong>5.0%</strong>.
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    onClick={() => handleApplyGst(Number(rateInput) || 5)}
                    disabled={applying}
                  >
                    <BadgeCheck size={16} />
                    <span>{applying ? 'Saving…' : `Save & Apply ${rateInput}% Rate`}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setRateInput('5');
                      handleApplyGst(5);
                    }}
                    disabled={applying}
                  >
                    Reset to 5% Standard
                  </Button>
                </div>
              )}
            </div>
          </SettingsCard>

          {/* Statutory Policy Rules */}
          <SettingsCard
            title="Statutory Invoicing Directives"
            description="Key statutory rules governing Maqam Travels composite tour taxation."
            icon={FileText}
          >
            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white">Zero Split Taxes on Packages:</strong> Unlike standalone flight markups (which itemize CGST 9% and SGST 9%), in-house pilgrimage packages present a single branded <strong>Agency Personal GST (5%)</strong> line.
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <Package size={16} className="text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white">Composite Service Treatment:</strong> Hotel stays, ground transfers, ziyarat excursions, and visa processing bundled into a package are treated as a unified composite supply under SAC 998555.
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white">Automatic Downstream Sync:</strong> Updating this rate immediately applies to all newly generated A4 executive PDF invoices and online checkout summaries.
                </div>
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Right Column: Invoice Preview & Sample Breakdown */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Receipt size={18} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Package Invoice Sample
                </h3>
                <p className="text-xs text-slate-400">How the customer tax row renders</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 p-4 font-mono text-xs space-y-2.5">
                <div className="flex justify-between text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-2 font-sans font-bold">
                  <span>Line Item</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between text-slate-800 dark:text-slate-200">
                  <span className="font-sans">15-Day Deluxe Umrah Package (SAC 998555)</span>
                  <span>₹{samplePackagePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-lg">
                  <span className="font-sans flex items-center gap-1">
                    <CheckCircle2 size={13} /> Agency Personal GST ({currentRate}%)
                  </span>
                  <span>+₹{sampleGstAmount.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-300 dark:border-slate-600 pt-2 flex justify-between text-sm font-sans font-black text-slate-900 dark:text-white">
                  <span>Grand Total Paid:</span>
                  <span className="text-emerald-700 dark:text-emerald-300">
                    ₹{sampleTotalPaid.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400 leading-relaxed">
                Notice: There are <strong>no split CGST or SGST lines</strong> rendered for in-house packages. The platform presents exclusively the single compliant Agency Personal GST line item.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
