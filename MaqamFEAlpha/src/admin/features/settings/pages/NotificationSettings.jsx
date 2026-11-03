import { useEffect, useState, useMemo } from 'react';
import {
  BellRing,
  Mail,
  MessageSquare,
  Sparkles,
  Info,
  CheckCircle2,
  Send,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import SettingsHeader from '../components/SettingsHeader';
import SettingsCard from '../components/SettingsCard';
import SettingsToggle from '../components/SettingsToggle';
import Input from '../../../components/common/Input';
import { settingsApi, DEFAULT_SETTINGS } from '../settingsApi';

export default function NotificationSettings() {
  const [form, setForm] = useState(DEFAULT_SETTINGS.notifications);
  const [savedData, setSavedData] = useState(DEFAULT_SETTINGS.notifications);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await settingsApi.get('notifications');
        if (isMounted) {
          setForm(data);
          setSavedData(data);
        }
      } catch (err) {
        toast.error('Failed to load notification settings');
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
        emailSenderName: String(form.emailSenderName || 'Maqam Travels Support').trim(),
        replyToEmail: String(form.replyToEmail || 'support@maqam.com').trim(),
        smsAlertsEnabled: Boolean(form.smsAlertsEnabled),
        whatsappAlertsEnabled: Boolean(form.whatsappAlertsEnabled),
      };
      const updated = await settingsApi.update('notifications', payload);
      setForm(updated);
      setSavedData(updated);
      toast.success('Notification settings saved successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update notification settings');
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
        title="Notifications & Messaging Settings"
        subtitle="Manage email sender identity, reply-to routing, and automated SMS traveler alerts."
        isDirty={isDirty}
        isSaving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Config */}
        <div className="space-y-6 lg:col-span-7">
          {/* Email Identity Card */}
          <SettingsCard
            title="Transactional Email Sender Identity"
            subtitle="The display name and reply-to address shown on all booking vouchers and payment receipts."
            icon={Mail}
          >
            <div className="space-y-4">
              <Input
                label="Sender Display Name"
                placeholder="e.g. Maqam Travels Support"
                value={form.emailSenderName || ''}
                onChange={(e) => setForm({ ...form, emailSenderName: e.target.value })}
              />

              <Input
                label="Reply-To Email Address"
                type="email"
                placeholder="support@maqam.com"
                value={form.replyToEmail || ''}
                onChange={(e) => setForm({ ...form, replyToEmail: e.target.value })}
              />

              <p className="text-xs text-slate-500 dark:text-slate-400">
                When customers hit "Reply" in Gmail, Outlook, or Apple Mail, their response will be
                routed directly to this inbox.
              </p>
            </div>
          </SettingsCard>

          {/* SMS & Mobile Alerts Card */}
          <SettingsCard
            title="Real-Time Mobile SMS Alerts"
            subtitle="Trigger automated short messaging to travelers upon critical booking updates."
            icon={Smartphone}
          >
            <div className="space-y-3.5">
              <SettingsToggle
                label="Automated SMS Alerts Delivery"
                description="Dispatch SMS updates for instant booking confirmation, schedule changes, and e-voucher downloads."
                checked={form.smsAlertsEnabled}
                onChange={(checked) => setForm({ ...form, smsAlertsEnabled: checked })}
                badge={
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Active Channel
                  </span>
                }
              />

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-200">
                  Supported Notification Events:
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-500 dark:text-slate-400">
                  <li>Payment successfully captured (e-receipt attached)</li>
                  <li>Flight PNR issued & seat allocation confirmation</li>
                  <li>Hotel voucher verification & check-in QR code</li>
                </ul>
              </div>
            </div>
          </SettingsCard>

          {/* WhatsApp Meta Cloud API Card */}
          <SettingsCard
            title="Meta WhatsApp Cloud API Alerts"
            subtitle="Send official WhatsApp HSM templates, booking status alerts, and PDF documents."
            icon={MessageSquare}
          >
            <div className="space-y-3.5">
              <SettingsToggle
                label="WhatsApp Confirmation & PNR Alerts"
                description="Stream instant PNR confirmation, PDF boarding pass cards, and live schedule updates via WhatsApp."
                checked={form.whatsappAlertsEnabled ?? true}
                onChange={(checked) => setForm({ ...form, whatsappAlertsEnabled: checked })}
                badge={
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    High Conversion
                  </span>
                }
              />

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Channel Integration: </span>
                <span>Meta WhatsApp Cloud API (Graph API) with Twilio WhatsApp fallback for Saudi Arabia / UAE.</span>
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Right Column: Live Email Client Mockup Preview */}
        <div className="space-y-6 lg:col-span-5">
          <SettingsCard
            title="Live Notification Preview"
            subtitle="Interactive view of how booking emails appear in the traveler's inbox."
            icon={Sparkles}
            badge={
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                Real-Time
              </span>
            }
          >
            <div className="space-y-4">
              {/* Email Mockup */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                {/* Email Client Header Bar */}
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Traveler Inbox View
                  </span>
                </div>

                {/* Email Metadata */}
                <div className="p-4 space-y-2 border-b border-slate-100 text-xs dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-16 font-semibold text-slate-400">From:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {form.emailSenderName || 'Maqam Travels Support'}
                    </span>
                    <span className="text-[11px] text-slate-400">&lt;notifications@maqam.com&gt;</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-16 font-semibold text-slate-400">Reply-To:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {form.replyToEmail || 'support@maqam.com'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-16 font-semibold text-slate-400">Subject:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Your Umrah Package Booking is Confirmed (Ref #MQ-99214)
                    </span>
                  </div>
                </div>

                {/* Email Body Snippet */}
                <div className="p-4 space-y-3 bg-slate-50/50 text-xs text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    Assalamu Alaikum Traveler,
                  </p>
                  <p>
                    Thank you for choosing{' '}
                    <strong className="text-slate-900 dark:text-white">
                      {form.emailSenderName || 'Maqam Travels'}
                    </strong>
                    . Your pilgrimage package reservation is confirmed. Your digital vouchers and
                    e-tickets have been generated.
                  </p>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-[11px] dark:border-emerald-950 dark:bg-emerald-950/20">
                    <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-200">
                      <span>Booking Status</span>
                      <span>Confirmed & Issued</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SMS Alert Badge Preview */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <Smartphone size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      SMS Traveler Dispatch
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {form.smsAlertsEnabled
                        ? 'Automated SMS alerts will be sent on flight/booking changes'
                        : 'SMS alerts are currently disabled'}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    form.smsAlertsEnabled
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {form.smsAlertsEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
