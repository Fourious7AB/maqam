import { useEffect, useState, useMemo } from 'react';
import {
  Percent,
  Plane,
  Hotel,
  TrendingUp,
  Receipt,
  Sparkles,
  Info,
  CheckCircle2,
  Calculator,
  Save,
  RotateCcw,
  ShieldAlert,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { toast } from 'react-toastify';
import SettingsHeader from '../components/SettingsHeader';
import SettingsCard from '../components/SettingsCard';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { settingsApi, DEFAULT_SETTINGS } from '../settingsApi';
import { useAuthStore } from '../../../store/authStore';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (Default)' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export default function MarkupSettings() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [form, setForm] = useState(DEFAULT_SETTINGS.markup);
  const [savedData, setSavedData] = useState(DEFAULT_SETTINGS.markup);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Buffer strings for fluid typing
  const [inputs, setInputs] = useState({
    flightMarkupPercent: '2.5',
    hotelMarkupPercent: '5.0',
    defaultMarkupPercent: '5.0',
  });

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await settingsApi.getMarkup();
        if (isMounted && data) {
          setForm(data);
          setSavedData(data);
          setInputs({
            flightMarkupPercent: String(data.flightMarkupPercent ?? 2.5),
            hotelMarkupPercent: String(data.hotelMarkupPercent ?? 5.0),
            defaultMarkupPercent: String(data.defaultMarkupPercent ?? 5.0),
          });
        }
      } catch {
        toast.error('Failed to load markup settings, using default values');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleInputChange = (field, rawValue) => {
    setInputs((prev) => ({ ...prev, [field]: rawValue }));
    const num = parseFloat(rawValue);
    if (!isNaN(num)) {
      setForm((prev) => ({ ...prev, [field]: Math.min(100, Math.max(0, num)) }));
    } else if (rawValue === '' || rawValue === '-') {
      setForm((prev) => ({ ...prev, [field]: 0 }));
    }
  };

  const handleSliderChange = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setInputs((prev) => ({ ...prev, [field]: String(val) }));
  };

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(savedData);
  }, [form, savedData]);

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Permission denied: Only Administrators can update commercial markup rates');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        flightMarkupPercent: Number(form.flightMarkupPercent) || 0,
        hotelMarkupPercent: Number(form.hotelMarkupPercent) || 0,
        defaultMarkupPercent: Number(form.defaultMarkupPercent) || 0,
        currency: form.currency || 'INR',
      };

      const updated = await settingsApi.updateMarkup(payload);
      setForm((prev) => ({ ...prev, ...updated }));
      setSavedData((prev) => ({ ...prev, ...updated }));
      setInputs({
        flightMarkupPercent: String(updated.flightMarkupPercent ?? payload.flightMarkupPercent),
        hotelMarkupPercent: String(updated.hotelMarkupPercent ?? payload.hotelMarkupPercent),
        defaultMarkupPercent: String(updated.defaultMarkupPercent ?? payload.defaultMarkupPercent),
      });

      toast.success('Commercial markup settings updated and synchronized across live booking engines!');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update markup settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(savedData);
    setInputs({
      flightMarkupPercent: String(savedData.flightMarkupPercent ?? 2.5),
      hotelMarkupPercent: String(savedData.hotelMarkupPercent ?? 5.0),
      defaultMarkupPercent: String(savedData.defaultMarkupPercent ?? 5.0),
    });
    toast.info('Changes discarded');
  };

  const currencyObj = CURRENCIES.find((c) => c.code === form.currency) || CURRENCIES[0];
  const symbol = currencyObj.symbol;

  // Live simulation math (sample values)
  const sampleFlightNet = form.currency === 'INR' ? 35000 : 450;
  const flightMarkupVal = (sampleFlightNet * (Number(form.flightMarkupPercent) || 0)) / 100;
  const flightGross = sampleFlightNet + flightMarkupVal;
  // 18% GST exclusively on markup amount (SAC 998555)
  const flightMarkupGst = flightMarkupVal * 0.18;
  const flightTotalInvoice = flightGross + flightMarkupGst;

  const sampleHotelNet = form.currency === 'INR' ? 8000 : 120;
  const hotelMarkupVal = (sampleHotelNet * (Number(form.hotelMarkupPercent) || 0)) / 100;
  const hotelGross = sampleHotelNet + hotelMarkupVal;
  const hotelMarkupGst = hotelMarkupVal * 0.18;
  const hotelTotalInvoice = hotelGross + hotelMarkupGst;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
          </div>
          <div className="h-96 rounded-2xl bg-slate-100 lg:col-span-5 dark:bg-slate-800/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <SettingsHeader
        title="Commercial Markup Engine"
        subtitle="Manage profit markups added on top of wholesale supplier net fares (SRDV Flights & Hotels). Changes sync live to search pricing and invoice generation."
        isDirty={isDirty}
        isSaving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />

      {!isAdmin && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert size={18} className="shrink-0" />
          <span>
            <strong>Read-Only Mode:</strong> You are viewing active commercial markups as staff. Only Administrators have permission to modify pricing parameters.
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Form Controls */}
        <div className="space-y-6 lg:col-span-7">
          {/* Operating Currency */}
          <SettingsCard
            title="Operating Currency"
            description="Base currency for commercial transactions and live platform inventory display."
            icon={TrendingUp}
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Platform Billing Currency
              </label>
              <select
                disabled={!isAdmin}
                value={form.currency || 'INR'}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} — {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </SettingsCard>

          {/* Flight Markup Card */}
          <SettingsCard
            title="Flight Wholesale Markup"
            description="Dynamic percentage margin added on top of wholesale net GDS/LCC airfares."
            icon={Plane}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Airfare Markup Rate
                </span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {form.flightMarkupPercent}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="25"
                step="0.1"
                disabled={!isAdmin}
                value={form.flightMarkupPercent || 0}
                onChange={(e) => handleSliderChange('flightMarkupPercent', parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
              />

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    label="Exact Percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    disabled={!isAdmin}
                    value={inputs.flightMarkupPercent}
                    onChange={(e) => handleInputChange('flightMarkupPercent', e.target.value)}
                    icon={Percent}
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 self-end pb-2.5">
                  Applied dynamically to all supplier net flight queries.
                </div>
              </div>
            </div>
          </SettingsCard>

          {/* Hotel Markup Card */}
          <SettingsCard
            title="Hotel Wholesale Markup"
            description="Dynamic percentage margin added to wholesale aggregator room tariffs."
            icon={Hotel}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Hotel Room Markup Rate
                </span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {form.hotelMarkupPercent}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="25"
                step="0.1"
                disabled={!isAdmin}
                value={form.hotelMarkupPercent || 0}
                onChange={(e) => handleSliderChange('hotelMarkupPercent', parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
              />

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    label="Exact Percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    disabled={!isAdmin}
                    value={inputs.hotelMarkupPercent}
                    onChange={(e) => handleInputChange('hotelMarkupPercent', e.target.value)}
                    icon={Percent}
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 self-end pb-2.5">
                  Added on top of Makkah, Madinah and partner room rates.
                </div>
              </div>
            </div>
          </SettingsCard>

          {/* Default Fallback Markup */}
          <SettingsCard
            title="Default Ancillary Markup"
            description="Fallback profit margin for custom packages, ground transportation, and ancillary add-ons."
            icon={Layers}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  label="Default Fallback Percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  disabled={!isAdmin}
                  value={inputs.defaultMarkupPercent}
                  onChange={(e) => handleInputChange('defaultMarkupPercent', e.target.value)}
                  icon={Percent}
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 self-end pb-2.5">
                Default fallback markup applied when specific service tariffs lack explicit overrides.
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Right Column: Live Simulator & Invoice Transparency */}
        <div className="space-y-6 lg:col-span-5">
          {/* Live Simulator Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Calculator size={18} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Live Price & Yield Simulator
                </h3>
                <p className="text-xs text-slate-400">Calculated with active margins</p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {/* Flight Sample Breakdown */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center justify-between pb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Plane size={14} className="text-emerald-600" /> Sample Flight Booking
                  </span>
                  <span className="text-emerald-600 font-extrabold">+{form.flightMarkupPercent}%</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
                  <div className="flex justify-between">
                    <span>Wholesale Net Fare:</span>
                    <span className="font-semibold">{symbol}{sampleFlightNet.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Agency Markup ({form.flightMarkupPercent}%):</span>
                    <span>+{symbol}{flightMarkupVal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>18% GST on Markup Only (SAC 998555):</span>
                    <span>+{symbol}{flightMarkupGst.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-extrabold text-slate-900 dark:text-white text-sm">
                    <span>Customer Total Price:</span>
                    <span className="text-emerald-700 dark:text-emerald-300">
                      {symbol}{flightTotalInvoice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hotel Sample Breakdown */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center justify-between pb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Hotel size={14} className="text-teal-600" /> Sample Hotel Night
                  </span>
                  <span className="text-teal-600 font-extrabold">+{form.hotelMarkupPercent}%</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
                  <div className="flex justify-between">
                    <span>Wholesale Room Tariff:</span>
                    <span className="font-semibold">{symbol}{sampleHotelNet.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-teal-600 dark:text-teal-400 font-bold">
                    <span>Agency Markup ({form.hotelMarkupPercent}%):</span>
                    <span>+{symbol}{hotelMarkupVal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>18% GST on Markup Only:</span>
                    <span>+{symbol}{hotelMarkupGst.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-extrabold text-slate-900 dark:text-white text-sm">
                    <span>Customer Total Price:</span>
                    <span className="text-teal-700 dark:text-teal-300">
                      {symbol}{hotelTotalInvoice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compliance Note */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info size={14} className="text-emerald-700 dark:text-emerald-400" />
                  <span>Statutory Invoicing Compliance</span>
                </div>
                <p className="leading-relaxed">
                  Per Indian GST compliance regulations, statutory 18% GST is levied <strong>exclusively on the agency markup amount</strong> under SAC 998555. Airline base fares and hotel accommodation tariffs remain pass-through costs and are protected from double taxation.
                </p>
              </div>

              {/* Action Buttons for Admin */}
              {isAdmin && isDirty && (
                <div className="pt-2 flex items-center gap-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save size={15} />
                    <span>{saving ? 'Synchronizing…' : 'Save Markup Settings'}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleReset}
                    disabled={saving}
                  >
                    <RotateCcw size={15} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
