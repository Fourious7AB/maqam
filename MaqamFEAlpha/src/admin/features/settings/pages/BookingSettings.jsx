import { useEffect, useState, useMemo } from 'react';
import {
  TicketCheck,
  Timer,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Users,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import SettingsHeader from '../components/SettingsHeader';
import SettingsCard from '../components/SettingsCard';
import SettingsToggle from '../components/SettingsToggle';
import Input from '../../../components/common/Input';
import { settingsApi, DEFAULT_SETTINGS } from '../settingsApi';

export default function BookingSettings() {
  const [form, setForm] = useState(DEFAULT_SETTINGS.booking);
  const [savedData, setSavedData] = useState(DEFAULT_SETTINGS.booking);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await settingsApi.get('booking');
        if (isMounted) {
          setForm(data);
          setSavedData(data);
        }
      } catch (err) {
        toast.error('Failed to load booking settings');
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
        holdDeadlineMinutes: Number(form.holdDeadlineMinutes) || 60,
        cancellationGraceHours: Number(form.cancellationGraceHours) || 24,
        autoVoucherEnabled: Boolean(form.autoVoucherEnabled),
        requireTravelerPassport: Boolean(form.requireTravelerPassport),
        allowCustomPackages: Boolean(form.allowCustomPackages),
        snapshotOnConfirmation: Boolean(form.snapshotOnConfirmation),
        maxTravelersPerBooking: Number(form.maxTravelersPerBooking) || 50,
      };
      const updated = await settingsApi.update('booking', payload);
      setForm(updated);
      setSavedData(updated);
      toast.success('Booking settings saved successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update booking settings');
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
        title="Booking & Voucher Settings"
        subtitle="Manage inventory lock limits, fee-free cancellation windows, and automated e-voucher issuance."
        isDirty={isDirty}
        isSaving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Configuration Forms */}
        <div className="space-y-6 lg:col-span-7">
          {/* Inventory Lock & Hold Limits */}
          <SettingsCard
            title="Inventory Locking & Hold Limits"
            subtitle="Maximum duration an unpaid booking holds flight and hotel room inventory."
            icon={Timer}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Hold Deadline (Minutes)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="5"
                      max="1440"
                      value={form.holdDeadlineMinutes ?? 60}
                      onChange={(e) =>
                        setForm({ ...form, holdDeadlineMinutes: parseInt(e.target.value, 10) || 0 })
                      }
                      className="pr-14"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      mins
                    </span>
                  </div>
                </div>

                {/* Preset Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Quick Presets:</span>
                  {[15, 30, 60, 120, 240, 1440].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setForm({ ...form, holdDeadlineMinutes: mins })}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        form.holdDeadlineMinutes === mins
                          ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                When a traveler selects inventory, seats and hotel allotments are temporarily locked.
                If unpaid after this period, the lock expires and inventory returns to the market.
              </p>
            </div>
          </SettingsCard>

          {/* Cancellation Grace Window */}
          <SettingsCard
            title="Cancellation Grace Period"
            subtitle="Timeframe after booking confirmation where traveler cancellations are 100% fee-free."
            icon={Clock}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Cancellation Grace Window (Hours)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="168"
                      value={form.cancellationGraceHours ?? 24}
                      onChange={(e) =>
                        setForm({ ...form, cancellationGraceHours: parseInt(e.target.value, 10) || 0 })
                      }
                      className="pr-14"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      hours
                    </span>
                  </div>
                </div>

                {/* Preset Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Quick Presets:</span>
                  {[0, 12, 24, 48, 72].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setForm({ ...form, cancellationGraceHours: hours })}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        form.cancellationGraceHours === hours
                          ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {hours === 0 ? 'No Grace' : `${hours}h`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SettingsCard>

          {/* Automation & Validation Policies */}
          <SettingsCard
            title="Automation & Validation Policies"
            subtitle="Voucher generation, traveler identity requirements, and booking limits."
            icon={FileCheck}
          >
            <div className="space-y-3.5">
              <SettingsToggle
                label="Automatic E-Voucher Issuance"
                description="Immediately generate and dispatch verified travel vouchers upon successful payment."
                checked={form.autoVoucherEnabled}
                onChange={(checked) => setForm({ ...form, autoVoucherEnabled: checked })}
                badge={
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Recommended
                  </span>
                }
              />

              <SettingsToggle
                label="Snapshot Itinerary On Confirmation"
                description="Save an immutable JSON snapshot of flights, hotels, and prices at time of payment."
                checked={form.snapshotOnConfirmation}
                onChange={(checked) => setForm({ ...form, snapshotOnConfirmation: checked })}
              />

              <SettingsToggle
                label="Require Traveler Passport for International Bookings"
                description="Block confirmation until valid passport numbers and expiration dates are supplied."
                checked={form.requireTravelerPassport}
                onChange={(checked) => setForm({ ...form, requireTravelerPassport: checked })}
              />

              <SettingsToggle
                label="Allow Custom Package Inquiries"
                description="Allow customers and agents to assemble dynamic multi-destination custom packages."
                checked={form.allowCustomPackages}
                onChange={(checked) => setForm({ ...form, allowCustomPackages: checked })}
              />

              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Maximum Travelers per Single Booking
                </label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={form.maxTravelersPerBooking ?? 50}
                  onChange={(e) =>
                    setForm({ ...form, maxTravelersPerBooking: parseInt(e.target.value, 10) || 1 })
                  }
                />
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Right Column: Visual Lifecycle Map */}
        <div className="space-y-6 lg:col-span-5">
          <SettingsCard
            title="Booking Lifecycle Flow"
            subtitle="Visual roadmap of how your settings control a traveler's reservation."
            icon={Sparkles}
            badge={
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                Rule Flow
              </span>
            }
          >
            <div className="relative space-y-4 before:absolute before:left-3.5 before:top-3 before:h-[82%] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {/* Step 1 */}
              <div className="relative flex items-start gap-3.5 pl-1">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Inventory Hold Lock
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Seats and rooms reserved for{' '}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {form.holdDeadlineMinutes} minutes
                    </span>
                    . Automatically released if checkout is abandoned.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex items-start gap-3.5 pl-1">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Payment & Voucher Release
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {form.autoVoucherEnabled ? (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Automatic E-Voucher active: PDF ticket and QR pass generated immediately.
                      </span>
                    ) : (
                      <span>Manual voucher review required by staff prior to traveler delivery.</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex items-start gap-3.5 pl-1">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Cancellation Grace Window
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Traveler can cancel with 100% refund for{' '}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {form.cancellationGraceHours} hours
                    </span>{' '}
                    post-booking.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative flex items-start gap-3.5 pl-1">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white shadow dark:bg-slate-600">
                  4
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Finalized & Locked
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Standard cancellation penalties and airline/hotel fare rules apply.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <AlertCircle size={15} className="inline mr-1 text-emerald-600 dark:text-emerald-400" />
              Adjusting the hold window affects rate locks with GDS flights and wholesaler room banks.
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
