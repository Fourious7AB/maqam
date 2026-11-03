import { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Clock,
  Coins,
  ShieldCheck,
  Sparkles,
  Info,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { toast } from 'react-toastify';
import SettingsHeader from '../components/SettingsHeader';
import SettingsCard from '../components/SettingsCard';
import Input from '../../../components/common/Input';
import { settingsApi, DEFAULT_SETTINGS } from '../settingsApi';
import logo from '../../../../assets/logo.png';

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST · UTC +5:30)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST · UTC +3:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST · UTC +4:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST · UTC +0:00)' },
  { value: 'America/New_York', label: 'America/New_York (EST · UTC -5:00)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export default function GeneralSettings() {
  const [form, setForm] = useState(DEFAULT_SETTINGS.general);
  const [savedData, setSavedData] = useState(DEFAULT_SETTINGS.general);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await settingsApi.get('general');
        if (isMounted) {
          setForm(data);
          setSavedData(data);
        }
      } catch (err) {
        toast.error('Failed to load general settings');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(savedData);
  }, [form, savedData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await settingsApi.update('general', form);
      setForm(updated);
      setSavedData(updated);
      toast.success('General settings saved successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(savedData);
    toast.info('Changes discarded');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
          </div>
          <div className="h-96 rounded-2xl bg-slate-100 lg:col-span-5 dark:bg-slate-800/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <SettingsHeader
        title="General Company Settings"
        subtitle="Manage organization identity, traveler support contact, and default operating timezone."
        isDirty={isDirty}
        isSaving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form Fields (Left Column) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Identity Card */}
          <SettingsCard
            title="Company Identity"
            subtitle="Public organization branding shown on traveler vouchers and itineraries."
            icon={Building2}
          >
            <div className="space-y-4">
              <Input
                label="Company Name"
                placeholder="e.g. Maqam Travels"
                value={form.companyName || ''}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Operating Base Currency
                  </label>
                  <div className="relative">
                    <select
                      value={form.currency || 'INR'}
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    System Timezone
                  </label>
                  <div className="relative">
                    <select
                      value={form.timezone || 'Asia/Kolkata'}
                      onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.75 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-emerald-950/40"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </SettingsCard>

          {/* Customer Support Card */}
          <SettingsCard
            title="Customer Support & Contact"
            subtitle="Official support contact channels printed on booking confirmations."
            icon={Phone}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Support Email"
                type="email"
                placeholder="support@maqam.com"
                value={form.supportEmail || ''}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
              />

              <Input
                label="Support Phone / WhatsApp"
                type="tel"
                placeholder="+911180808080"
                value={form.supportPhone || ''}
                onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
              />
            </div>
          </SettingsCard>
        </div>

        {/* Live Visual Preview (Right Column) */}
        <div className="space-y-6 lg:col-span-5">
          <SettingsCard
            title="Live Brand & Voucher Preview"
            subtitle="Preview how your organization info appears to travelers."
            icon={Sparkles}
            badge={
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                Live Sync
              </span>
            }
          >
            <div className="space-y-4">
              {/* Preview Voucher Badge Card */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-5 shadow-inner dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/60">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={logo}
                      alt="Logo"
                      className="h-9 w-9 rounded-lg object-contain p-0.5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {form.companyName || 'Maqam Travels'}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Official E-Voucher</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {form.currency || 'INR'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">Support Desk</span>
                    <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {form.supportEmail || 'support@maqam.com'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">Hotline</span>
                    <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                      {form.supportPhone || '+911180808080'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">Base Timezone</span>
                    <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                      {form.timezone || 'Asia/Kolkata'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">Current Server Time</span>
                    <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                      {new Date().toLocaleTimeString('en-US', {
                        timeZone: form.timezone || 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informational Guidance */}
              <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                <Info size={16} className="shrink-0 text-emerald-600 mt-0.5 dark:text-emerald-400" />
                <p>
                  Changes saved here immediately update the header metadata, automated receipts,
                  and customer invoice templates generated across the platform.
                </p>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
