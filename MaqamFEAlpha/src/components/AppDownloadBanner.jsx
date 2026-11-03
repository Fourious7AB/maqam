import { useState } from "react";
import { ArrowDownToLine, Smartphone } from "lucide-react";

const appUrl = "https://maqamtravels.com/app";

const AppDownloadBanner = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) return;
    setSent(true);
  };

  return (
    <section className="bg-[#f3f4f6] dark:bg-[#070c18] px-4 py-6 md:px-6 md:py-8 transition-colors">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 overflow-hidden rounded-[18px] border border-[#dfe5ea] dark:border-slate-800 bg-white dark:bg-[#111a2e] px-5 py-5 shadow-[0_3px_12px_rgba(15,23,42,0.04)] sm:px-8 md:flex-row md:justify-between md:px-10 md:py-7">
        <div className="flex w-full items-center gap-4 md:max-w-[62%]">
          <div className="hidden h-14 w-14 items-center justify-center rounded-xl border border-[#dfeaf2] dark:border-slate-700 bg-[#f4fbfd] dark:bg-slate-800 text-[#0f766e] dark:text-teal-400 shadow-sm sm:flex">
            <Smartphone size={28} strokeWidth={1.8} />
          </div>

          <div className="w-full">
            <h2 className="text-[clamp(1.8rem,2.2vw,2.6rem)] font-extrabold leading-tight tracking-[-0.04em] text-gray-950 dark:text-white">
              Download App Now!
            </h2>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Use code <span className="font-bold">WELCOME</span> and get up to{" "}
              <span className="font-bold text-slate-900 dark:text-teal-400">₹5,000 OFF</span> on
              your first hotel booking.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-5 flex max-w-[530px] flex-col gap-2 sm:flex-row"
            >
              <label className="flex h-12 flex-1 items-center rounded-lg border border-[#b7d1df] dark:border-slate-700 bg-white dark:bg-[#0b1120] px-3 text-sm text-gray-800 dark:text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <span className="mr-2 border-r border-[#d9e2e8] dark:border-slate-700 pr-2 text-gray-500">
                  🇮🇳 <span className="font-medium text-gray-700 dark:text-slate-300">+91</span>
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(event) => {
                    setMobileNumber(event.target.value.replace(/\D/g, ""));
                    setSent(false);
                  }}
                  placeholder="Enter mobile number"
                  aria-label="Mobile number"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder:text-gray-500 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                className="h-12 rounded-lg bg-[#0a8fab] px-5 text-sm font-extrabold uppercase tracking-[0.03em] text-white transition hover:bg-[#0c7e98]"
              >
                {sent ? "LINK SENT" : "GET APP LINK"}
              </button>
            </form>

            {sent && (
              <p className="mt-2 text-xs font-semibold text-emerald-600">
                App link request received for +91 {mobileNumber}.
              </p>
            )}
          </div>
        </div>

        <div className="flex w-full items-center justify-center gap-5 sm:gap-6 md:w-auto">
          <div className="flex flex-col gap-2.5">
            <a
              href={appUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 min-w-[160px] items-center justify-center gap-2 rounded-md bg-[#0d0d0d] px-3 text-left text-white shadow-sm transition hover:bg-[#1a1a1a]"
            >
              <ArrowDownToLine size={18} />
              <span className="leading-none">
                <small className="block text-[8px] font-medium uppercase tracking-[0.14em] text-white/80">
                  Get it on
                </small>
                <strong className="text-sm font-bold">Google Play</strong>
              </span>
            </a>
            <a
              href={appUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 min-w-[160px] items-center justify-center gap-2 rounded-md bg-[#0d0d0d] px-3 text-left text-white shadow-sm transition hover:bg-[#1a1a1a]"
            >
              <span className="text-xl leading-none"></span>
              <span className="leading-none">
                <small className="block text-[8px] font-medium uppercase tracking-[0.08em] text-white/80">
                  Download on the
                </small>
                <strong className="text-sm font-bold">App Store</strong>
              </span>
            </a>
          </div>

          <a
            href={appUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open app download QR code"
            className="flex h-28 w-28 items-center justify-center rounded-xl border border-[#111827] bg-white p-2 shadow-inner shadow-slate-200 sm:h-32 sm:w-32"
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(appUrl)}`}
              alt="Scan to download the Maqam app"
              className="h-full w-full object-contain"
            />
          </a>
        </div>
      </div>
    </section>
  );
};

export default AppDownloadBanner;
