import { useEffect, useState, useMemo } from 'react';
import {
  Coins,
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
  BarChart3,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import SettingsHeader from '../components/SettingsHeader';
import SettingsCard from '../components/SettingsCard';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { settingsApi, DEFAULT_SETTINGS } from '../settingsApi';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar (Platform Base)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export default function FinancialSettings() {
  const [form, setForm] = useState(DEFAULT_SETTINGS.financial);
  const [savedData, setSavedData] = useState(DEFAULT_SETTINGS.financial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // String buffers for smooth decimal/clearing text inputs
  const [inputs, setInputs] = useState({
    taxPercentage: '5',
    flightMarkupPercent: '10',
    flightMarkupFixedPrice: '0',
    hotelMarkupPercent: '5',
    hotelMarkupFixedPrice: '0',
    defaultMarkupPercent: '10',
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
            taxPercentage: String(data.taxPercentage ?? 5),
            flightMarkupPercent: String(data.flightMarkupPercent ?? 10),
            flightMarkupFixedPrice: String(data.flightMarkupFixedPrice ?? 0),
            hotelMarkupPercent: String(data.hotelMarkupPercent ?? 5),
            hotelMarkupFixedPrice: String(data.hotelMarkupFixedPrice ?? 0),
            defaultMarkupPercent: String(data.defaultMarkupPercent ?? data.flightMarkupPercent ?? 10),
          });
        }
      } catch {
        toast.error('Failed to load financial settings, using cached local settings');
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
      setForm((prev) => ({ ...prev, [field]: num }));
    } else if (rawValue === '' || rawValue === '-') {
      setForm((prev) => ({ ...prev, [field]: 0 }));
    }
  };

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(savedData);
  }, [form, savedData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        currency: form.currency || 'USD',
        taxPercentage: Number(form.taxPercentage) || 0,
        flightMarkupPercent: Number(form.flightMarkupPercent) || 0,
        flightMarkupFixedPrice: Number(form.flightMarkupFixedPrice) || 0,
        hotelMarkupPercent: Number(form.hotelMarkupPercent) || 0,
        hotelMarkupFixedPrice: Number(form.hotelMarkupFixedPrice) || 0,
        defaultMarkupPercent: Number(form.defaultMarkupPercent ?? form.flightMarkupPercent) || 0,
        markPercent: Number(form.flightMarkupPercent) || 0,
      };

      // Update markup via CRM endpoint (/api/v1/crm/markup)
      const updated = await settingsApi.updateMarkup(payload);

      setForm((prev) => ({ ...prev, ...updated }));
      setSavedData((prev) => ({ ...prev, ...updated }));
      setInputs({
        taxPercentage: String(updated.taxPercentage ?? payload.taxPercentage),
        flightMarkupPercent: String(updated.flightMarkupPercent ?? payload.flightMarkupPercent),
        flightMarkupFixedPrice: String(updated.flightMarkupFixedPrice ?? payload.flightMarkupFixedPrice),
        hotelMarkupPercent: String(updated.hotelMarkupPercent ?? payload.hotelMarkupPercent),
        hotelMarkupFixedPrice: String(updated.hotelMarkupFixedPrice ?? payload.hotelMarkupFixedPrice),
        defaultMarkupPercent: String(updated.defaultMarkupPercent ?? payload.defaultMarkupPercent),
      });

      toast.success('Markup and financial settings saved and applied across platform!');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update financial settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(savedData);
    setInputs({
      taxPercentage: String(savedData.taxPercentage ?? 5),
      flightMarkupPercent: String(savedData.flightMarkupPercent ?? 10),
      flightMarkupFixedPrice: String(savedData.flightMarkupFixedPrice ?? 0),
      hotelMarkupPercent: String(savedData.hotelMarkupPercent ?? 5),
      hotelMarkupFixedPrice: String(savedData.hotelMarkupFixedPrice ?? 0),
      defaultMarkupPercent: String(savedData.defaultMarkupPercent ?? savedData.flightMarkupPercent ?? 10),
    });
    toast.info('Changes discarded');
  };

  // Live simulation math
  const currencySymbol = CURRENCIES.find((c) => c.code === form.currency)?.symbol || '$';

  // Sample Flight: 450 base wholesale
  const flightBase = 450;
  const flightMarkupPctAmount = (flightBase * (Number(form.flightMarkupPercent) || 0)) / 100;
  const flightFixedMarkup = Number(form.flightMarkupFixedPrice) || 0;
  const flightTotalMarkup = flightMarkupPctAmount + flightFixedMarkup;
  const flightSubtotal = flightBase + flightTotalMarkup;
  const flightTax = (flightSubtotal * (Number(form.taxPercentage) || 0)) / 100;
  const flightTotal = flightSubtotal + flightTax;

  // Sample Hotel: 120 base wholesale per night
  const hotelBase = 120;
  const hotelMarkupPctAmount = (hotelBase * (Number(form.hotelMarkupPercent) || 0)) / 100;
  const hotelFixedMarkup = Number(form.hotelMarkupFixedPrice) || 0;
  const hotelTotalMarkup = hotelMarkupPctAmount + hotelFixedMarkup;
  const hotelSubtotal = hotelBase + hotelTotalMarkup;
  const hotelTax = (hotelSubtotal * (Number(form.taxPercentage) || 0)) / 100;
  const hotelTotal = hotelSubtotal + hotelTax;

  // Margin Analysis Data
  const projectedFlightProfit100 = flightTotalMarkup * 100;
  const projectedHotelProfit100 = hotelTotalMarkup * 100;
  const flightMarginYield = ((flightTotalMarkup / (flightBase || 1)) * 100).toFixed(1);
  const hotelMarginYield = ((hotelTotalMarkup / (hotelBase || 1)) * 100).toFixed(1);

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
        title="Financial & Taxation Settings"
        subtitle="Configure default billing currency, Goods & Services Tax (GST) / VAT rates, wholesale markups, and analyze retail profit margins."
        isDirty={isDirty}
        isSaving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Form Controls */}
        <div className="space-y-6 lg:col-span-7">
          {/* Currency Card */}
          <SettingsCard
            title="Operating Billing Currency"
            subtitle="Base settlement currency used for quoting, payments, and accounting across platform."
            icon={Coins}
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Default Currency Code
              </label>
              <select
                value={form.currency || 'USD'}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.75 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-emerald-950/40"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) — {c.name}
                  </option>
                ))}
              </select>
            </div>
          </SettingsCard>

          {/* Wholesale Markups Card */}
          <SettingsCard
            title="Profit Markups (Wholesale to Retail)"
            subtitle="Dynamic profit margins & flat markup fees added directly onto live flight tickets, hotel rooms, and packages."
            icon={TrendingUp}
          >
            <div className="space-y-6">
              {/* Flight Markup Section */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                    <Plane size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Flight Ticket Markup</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    +{form.flightMarkupPercent}% {form.flightMarkupFixedPrice > 0 ? `+ ${currencySymbol}${form.flightMarkupFixedPrice}` : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Flight Markup Percentage (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="0.5"
                        value={form.flightMarkupPercent ?? 10}
                        onChange={(e) => handleInputChange('flightMarkupPercent', e.target.value)}
                        className="h-2 w-full cursor-pointer accent-emerald-600 dark:accent-emerald-500 rounded-lg bg-slate-200 dark:bg-slate-700"
                      />
                      <div className="w-24 shrink-0">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={inputs.flightMarkupPercent}
                          onChange={(e) => handleInputChange('flightMarkupPercent', e.target.value)}
                          className="text-right text-xs"
                          placeholder="10.0"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Flight Fixed Markup Fee ({currencySymbol})
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={inputs.flightMarkupFixedPrice}
                      onChange={(e) => handleInputChange('flightMarkupFixedPrice', e.target.value)}
                      placeholder="0 (e.g. flat fee)"
                      className="text-right text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Hotel Markup Section */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                    <Hotel size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Hotel Room Markup</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    +{form.hotelMarkupPercent}% {form.hotelMarkupFixedPrice > 0 ? `+ ${currencySymbol}${form.hotelMarkupFixedPrice}` : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Hotel Markup Percentage (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="0.5"
                        value={form.hotelMarkupPercent ?? 5}
                        onChange={(e) => handleInputChange('hotelMarkupPercent', e.target.value)}
                        className="h-2 w-full cursor-pointer accent-emerald-600 dark:accent-emerald-500 rounded-lg bg-slate-200 dark:bg-slate-700"
                      />
                      <div className="w-24 shrink-0">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={inputs.hotelMarkupPercent}
                          onChange={(e) => handleInputChange('hotelMarkupPercent', e.target.value)}
                          className="text-right text-xs"
                          placeholder="5.0"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Hotel Fixed Markup Price ({currencySymbol})
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={inputs.hotelMarkupFixedPrice}
                      onChange={(e) => handleInputChange('hotelMarkupFixedPrice', e.target.value)}
                      placeholder="0 (e.g. flat room fee)"
                      className="text-right text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Default Package Markup */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Default Platform / Custom Package Markup (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={form.defaultMarkupPercent ?? 10}
                    onChange={(e) => handleInputChange('defaultMarkupPercent', e.target.value)}
                    className="h-2 w-full cursor-pointer accent-emerald-600 dark:accent-emerald-500 rounded-lg bg-slate-200 dark:bg-slate-700"
                  />
                  <div className="w-24 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={inputs.defaultMarkupPercent}
                      onChange={(e) => handleInputChange('defaultMarkupPercent', e.target.value)}
                      className="text-right text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* In-Card Save Action */}
              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSave}
                  loading={saving}
                  className="text-xs sm:text-sm shadow-md"
                >
                  <Save size={15} />
                  Save &amp; Apply Markup Now
                </Button>
              </div>
            </div>
          </SettingsCard>

          {/* Tax Settings Card */}
          <SettingsCard
            title="Taxation & Government Levies"
            subtitle="Universal Goods and Services Tax (GST) or VAT percentage applied at checkout."
            icon={Receipt}
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tax / VAT Rate (%)
                  </label>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {form.taxPercentage}%
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="28"
                    step="0.5"
                    value={form.taxPercentage ?? 5}
                    onChange={(e) => handleInputChange('taxPercentage', e.target.value)}
                    className="h-2 w-full cursor-pointer accent-emerald-600 dark:accent-emerald-500 rounded-lg bg-slate-200 dark:bg-slate-700"
                  />
                  <div className="w-24 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={inputs.taxPercentage}
                      onChange={(e) => handleInputChange('taxPercentage', e.target.value)}
                      className="text-right text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Standard GST Presets:</span>
                {[0, 5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleInputChange('taxPercentage', String(rate))}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      form.taxPercentage === rate
                        ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Right Column: Live Simulator & Data Analysis */}
        <div className="space-y-6 lg:col-span-5">
          {/* Data Analysis Card */}
          <SettingsCard
            title="Markup & Margin Profit Analysis"
            subtitle="Real-time projection analyzing revenue gains based on configured wholesale markups."
            icon={BarChart3}
            badge={
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <ArrowUpRight size={12} />
                Analytics
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  Flight Profit / 100 sales
                </span>
                <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 block">
                  {currencySymbol}{projectedFlightProfit100.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Avg Yield: +{flightMarginYield}%
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  Hotel Profit / 100 nights
                </span>
                <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 block">
                  {currencySymbol}{projectedHotelProfit100.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Avg Yield: +{hotelMarginYield}%
                </span>
              </div>
            </div>
          </SettingsCard>

          {/* Live Simulator Preview */}
          <SettingsCard
            title="Real-Time Price Breakdown Simulator"
            subtitle="Live calculation simulating how markups and taxes reflect on retail quotes."
            icon={Calculator}
            badge={
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                Dynamic
              </span>
            }
          >
            <div className="space-y-5">
              {/* Flight Simulation Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Plane size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Sample Flight Ticket
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Net: {currencySymbol}{flightBase}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Wholesale Cost</span>
                    <span>{currencySymbol}{flightBase.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                    <span>Active Flight Markup (+{form.flightMarkupPercent}%)</span>
                    <span>+{currencySymbol}{flightTotalMarkup.toFixed(2)}</span>
                  </div>
                  {flightFixedMarkup > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-[11px] pl-2">
                      <span>↳ Includes fixed markup fee</span>
                      <span>+{currencySymbol}{flightFixedMarkup.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tax / GST (+{form.taxPercentage}%)</span>
                    <span>+{currencySymbol}{flightTax.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white text-sm">
                    <span>Final Retail Price</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {currencySymbol}{flightTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hotel Simulation Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Hotel size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Sample Hotel Room / Night
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Net: {currencySymbol}{hotelBase}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Wholesale Cost</span>
                    <span>{currencySymbol}{hotelBase.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                    <span>Active Hotel Markup (+{form.hotelMarkupPercent}%)</span>
                    <span>+{currencySymbol}{hotelTotalMarkup.toFixed(2)}</span>
                  </div>
                  {hotelFixedMarkup > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-[11px] pl-2">
                      <span>↳ Includes fixed room fee</span>
                      <span>+{currencySymbol}{hotelFixedMarkup.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tax / GST (+{form.taxPercentage}%)</span>
                    <span>+{currencySymbol}{hotelTax.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white text-sm">
                    <span>Final Retail Price</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {currencySymbol}{hotelTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Regulatory Notice */}
              <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                <ShieldCheck size={16} className="shrink-0 text-emerald-600 mt-0.5 dark:text-emerald-400" />
                <p>
                  Wholesale markups apply dynamically across all newly generated flight and hotel shopping sessions. Saved changes persist locally and broadcast immediately across active user tabs.
                </p>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
