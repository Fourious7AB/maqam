import React from "react";
import {
  CheckCircle2,
  Clock,
  Send,
  RotateCcw,
  Sparkles,
  XCircle,
  FileText,
} from "lucide-react";

const STAGE_STEPS = [
  { key: "created", label: "Requested", icon: FileText },
  { key: "under_review", label: "Under Review", icon: Clock },
  { key: "quote_ready", label: "Proposal Issued", icon: Send },
  { key: "customer_response", label: "Customer Decision", icon: RotateCcw },
  { key: "booked", label: "Confirmed", icon: Sparkles },
];

export default function QuoteTimeline({ quote }) {
  if (!quote) return null;

  const currentStage = quote.stage || "under_review";
  const timeline = Array.isArray(quote.timeline) ? quote.timeline : [];

  const getStepStatus = (stepKey) => {
    if (stepKey === "created") return "completed";

    if (stepKey === "under_review") {
      if (["quote_ready", "accepted", "revision_requested", "booked", "closed"].includes(currentStage)) {
        return "completed";
      }
      return "current";
    }

    if (stepKey === "quote_ready") {
      if (["accepted", "revision_requested", "booked", "closed"].includes(currentStage)) {
        return "completed";
      }
      if (currentStage === "quote_ready") return "current";
      return "pending";
    }

    if (stepKey === "customer_response") {
      if (["booked", "closed"].includes(currentStage)) return "completed";
      if (["accepted", "revision_requested"].includes(currentStage)) return "current";
      return "pending";
    }

    if (stepKey === "booked") {
      if (currentStage === "booked") return "completed";
      return "pending";
    }

    return "pending";
  };

  return (
    <div className="space-y-4">
      {/* Visual Pipeline Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4">
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {STAGE_STEPS.map((step, idx) => {
            const status = getStepStatus(step.key);
            const Icon = step.icon;

            const isCompleted = status === "completed";
            const isCurrent = status === "current";

            return (
              <div key={step.key} className="flex flex-col items-center text-center">
                <div
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs font-bold transition ${
                    isCompleted
                      ? "bg-emerald-600 text-white shadow-xs"
                      : isCurrent
                      ? "bg-[#0f6b7b] text-white ring-4 ring-teal-500/20 animate-pulse"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                </div>
                <span
                  className={`mt-1.5 text-[10px] sm:text-[11px] font-bold line-clamp-1 ${
                    isCompleted
                      ? "text-emerald-700 dark:text-emerald-400"
                      : isCurrent
                      ? "text-[#0f6b7b] dark:text-teal-300"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit Log / Event Feed */}
      {timeline.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Activity Log
          </span>
          <div className="relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 space-y-3">
            {timeline.map((item, idx) => {
              const isWon = item.type === "won" || item.type === "booked";
              const isProposal = item.type === "quote_sent";
              const isResponse = item.type === "customer_response";

              return (
                <div key={item.id || idx} className="relative group">
                  <div
                    className={`absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      isWon
                        ? "bg-emerald-500"
                        : isProposal
                        ? "bg-purple-500"
                        : isResponse
                        ? "bg-sky-500"
                        : "bg-teal-500"
                    }`}
                  />
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                    {item.detail && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
