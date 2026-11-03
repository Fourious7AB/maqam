import React, { useState } from "react";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { deleteCurrentUserAccount, logout } from "./reducer/AuthSlice";
import { Trash2, AlertTriangle, X, ShieldAlert, Check } from "lucide-react";

const DeleteAccountModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [isPermanent, setIsPermanent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const resultAction = await dispatch(
        deleteCurrentUserAccount({ permanent: isPermanent })
      );

      if (deleteCurrentUserAccount.fulfilled.match(resultAction)) {
        toast.success(
          isPermanent
            ? "Your account and personal data have been permanently deleted."
            : "Your account has been deactivated successfully."
        );
      } else {
        // Fallback cleanup if token already expired or rejected
        dispatch(logout());
        toast.info("Your account session has been closed.");
      }

      onClose();

      // Short delay for toast visibility before redirect
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (err) {
      console.error("Delete account error:", err);
      toast.error(err?.message || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={() => !isDeleting && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0d1527] p-6 shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden font-poppins animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-slate-100 leading-tight">
                {isPermanent ? "Permanently Delete Account" : "Deactivate Account"}
              </h3>
              <p className="text-xs text-gray-400 dark:text-slate-400">Manage account access &amp; data</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning Alert Box */}
        <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/30 p-3.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <p className="font-bold text-amber-950 dark:text-amber-100 mb-0.5">Please read carefully</p>
              {isPermanent ? (
                <span>
                  Permanent deletion will <strong>permanently erase</strong> your profile, authentication credentials, and saved co-travellers from our database. <strong>This action cannot be undone.</strong>
                </span>
              ) : (
                <span>
                  Deactivating your account will <strong>soft-delete your profile</strong> and immediately revoke active login sessions. Booking and transaction history remain archived for safety.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Permanent Toggle Checkbox */}
        <div className="mt-4 rounded-2xl border border-gray-200/80 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/50 p-3.5 hover:border-gray-300 dark:hover:border-slate-600 transition">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                checked={isPermanent}
                onChange={(e) => setIsPermanent(e.target.checked)}
                disabled={isDeleting}
                className="peer sr-only"
              />
              <div className="h-5 w-5 rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition peer-checked:border-rose-600 peer-checked:bg-rose-600 flex items-center justify-center">
                <Check size={13} className="text-white opacity-0 peer-checked:opacity-100 transition" />
              </div>
            </div>
            <div className="text-xs">
              <span className="font-bold text-gray-800 dark:text-slate-200">
                Permanently purge data from database
              </span>
              <p className="text-gray-500 dark:text-slate-400 mt-0.5">
                Check this if you want to physically remove your records rather than deactivating.
              </p>
            </div>
          </label>
        </div>

        {/* Actions Footer */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-60 ${
              isPermanent
                ? "bg-red-700 hover:bg-red-800"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {isDeleting ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>{isPermanent ? "Delete Permanently" : "Deactivate Account"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
