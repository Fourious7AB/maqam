import { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Timer,
  RefreshCw,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import SettingsHeader from '../components/SettingsHeader';
import SettingsCard from '../components/SettingsCard';
import SettingsToggle from '../components/SettingsToggle';
import Input from '../../../components/common/Input';
import { settingsApi, DEFAULT_SETTINGS } from '../settingsApi';

export default function OTPSettings() {
  const [form, setForm] = useState(DEFAULT_SETTINGS.otp);
  const [savedData, setSavedData] = useState(DEFAULT_SETTINGS.otp);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await settingsApi.get('otp');
        if (isMounted) {
          setForm(data);
          setSavedData(data);
        }
      } catch (err) {
        toast.error('Failed to load OTP settings');
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
      const payload = {
        provider: String(form.provider || 'Fast2SMS (Backend)').trim(),
        length: parseInt(form.length, 10) || 6,
        expirySeconds: parseInt(form.expirySeconds, 10) || 120,
        maxAttempts: parseInt(form.maxAttempts, 10) || 5,
        resendCooldownSeconds: parseInt(form.resendCooldownSeconds, 10) || 30,
        bookingConfirmationRequired: Boolean(form.bookingConfirmationRequired),
        paymentConfirmationRequired: Boolean(form.paymentConfirmationRequired),
      };
      const updated = await settingsApi.update('otp', payload);
      setForm(updated);
      setSavedData(updated);
      toast.success('Security & OTP settings saved successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update OTP settings');
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
            <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
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
        title="Security & OTP Policies"
        subtitle="Configure One-Time Password duration, lockout parameters, and sensitive-action gates."
        isDirty={isDirty}
        isSaving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Form */}
        <div className="space-y-6 lg:col-span-7">
          {/* OTP Core Parameters */}
          <SettingsCard
            title="OTP Generation & Expiry"
            subtitle="Parameters governing token complexity, expiration, and resend rate-limiting."
            icon={KeyRound}
          >
            <div className="space-y-4">
              <Input
                label="SMS Gateway Provider"
                value={form.provider || 'Fast2SMS (Backend)'}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="OTP Digit Length"
                  type="number"
                  min="4"
                  max="8"
                  value={form.length ?? 6}
                  onChange={(e) => setForm({ ...form, length: parseInt(e.target.value, 10) || 6 })}
                />

                <Input
                  label="Validity Duration (Seconds)"
                  type="number"
                  min="30"
                  max="600"
                  value={form.expirySeconds ?? 120}
                  onChange={(e) =>
                    setForm({ ...form, expirySeconds: parseInt(e.target.value, 10) || 120 })
                  }
                />

                <Input
                  label="Max Failed Attempts"
                  type="number"
                  min="1"
                  max="10"
                  value={form.maxAttempts ?? 5}
                  onChange={(e) =>
                    setForm({ ...form, maxAttempts: parseInt(e.target.value, 10) || 5 })
                  }
                />

                <Input
                  label="Resend Cooldown (Seconds)"
                  type="number"
                  min="0"
                  max="180"
                  value={form.resendCooldownSeconds ?? 30}
                  onChange={(e) =>
                    setForm({ ...form, resendCooldownSeconds: parseInt(e.target.value, 10) || 30 })
                  }
                />
              </div>
            </div>
          </SettingsCard>

          {/* Verification Gates */}
          <SettingsCard
            title="Sensitive Operational Action Gates"
            subtitle="Require secondary OTP verification before committing critical financial actions."
            icon={Lock}
          >
            <div className="space-y-3.5">
              <SettingsToggle
                label="Require OTP for Booking Finalization"
                description="Require traveler or agent to input verified phone OTP before locking inventory."
                checked={form.bookingConfirmationRequired}
                onChange={(checked) => setForm({ ...form, bookingConfirmationRequired: checked })}
              />

              <SettingsToggle
                label="Require OTP for Online Payment Capture"
                description="Enforce two-factor validation before charging stored payment methods or issuing refunds."
                checked={form.paymentConfirmationRequired}
                onChange={(checked) => setForm({ ...form, paymentConfirmationRequired: checked })}
              />
            </div>
          </SettingsCard>
        </div>

        {/* Right Column: Security Guidance */}
        <div className="space-y-6 lg:col-span-5">
          <SettingsCard
            title="Security Audit & Compliance"
            subtitle="System safeguards and anti-tamper authentication guarantees."
            icon={ShieldCheck}
            badge={
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                Hardened
              </span>
            }
          >
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="flex gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs">Cryptographic Backend Hashing</h5>
                    <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                      Raw SMS provider API keys and secrets are stored in secure backend environment
                      variables and never exposed across the REST interface.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-medium text-slate-400">Lockout Policy</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    After {form.maxAttempts} incorrect tries
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-medium text-slate-400">Token Lifetime</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {form.expirySeconds} seconds ({Math.floor((form.expirySeconds || 120) / 60)}m)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-medium text-slate-400">Resend Throttle</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {form.resendCooldownSeconds}s cooldown
                  </span>
                </div>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
