import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { logout } from "./reducer/AuthSlice";
import { LogOut, X } from "lucide-react";
import { authSession } from "../services/authSession";
import { useAuthStore } from "../admin/store/authStore";

const LogOutPopModal = ({ isModalOpen, setModalOpen }) => {
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      setModalOpen(false);

      // Single network notification & store teardown via central authStore
      try {
        await useAuthStore.getState().logout();
      } catch (logoutErr) {
        console.warn("Backend logout notice:", logoutErr);
      }

      // Memory scrubbing, draft purging and client Redux state reset
      authSession.clear();
      dispatch(logout());

      toast.success("Logged out successfully");
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err);
      authSession.clear();
      dispatch(logout());
      window.location.href = "/";
    }
  };

  if (!isModalOpen) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={() => setModalOpen(false)}
    >
      <div
        className="pointer-events-auto relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#0d1527] p-6 shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <LogOut size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-slate-100 leading-tight">
                Log Out
              </h3>
              <p className="text-xs text-gray-400 dark:text-slate-400">Confirm session logout</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="p-1 rounded-full text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
          Are you sure you want to log out of your account? You will need to sign back in to view your bookings and saved details.
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Yes, Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogOutPopModal;
