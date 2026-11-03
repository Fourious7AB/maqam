import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { resetPassword } from "./reducer/AuthSlice";
const ChangePasswordModal = ({
  isResetPasswordModal,
  setResetPasswordModal,
}) => {
  const dispatch = useDispatch();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = (data) => {
    console.log(data);
    console.log("data!", data);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        {isResetPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0d1527] border border-gray-100 dark:border-slate-800 p-6 shadow-2xl">
              <h3 className="mb-6 text-xl font-bold text-gray-900 dark:text-slate-100">Change Password</h3>

              {/* Old Password */}
              <div className="relative mb-5">
                <label className="absolute -top-2 left-3 bg-white dark:bg-[#0d1527] px-1 text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase">
                  Old Password
                </label>

                <input
                  placeholder="Enter your old password"
                  type={showOldPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 text-gray-900 dark:text-slate-100 px-4 py-3.5 pr-12 outline-none focus:ring-2 focus:ring-teal-500"
                  {...register("oldpassword", {
                    required: "Old Password is required",
                  })}
                />
                {errors.oldpassword && (
                  <p className="text-red-500 text-sm py-2">
                    {errors.oldpassword.message}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
                >
                  {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* New Password */}
              <div className="relative mb-5">
                <label className="absolute -top-2 left-3 bg-white dark:bg-[#0d1527] px-1 text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase">
                  New Password
                </label>

                <input
                  placeholder="Enter your new password"
                  type={showNewPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 text-gray-900 dark:text-slate-100 px-4 py-3.5 pr-12 outline-none focus:ring-2 focus:ring-teal-500"
                  {...register("newpassword", {
                    required: "New Password is required",
                  })}
                />
                {errors.newpassword && (
                  <p className="text-red-500 text-sm py-2">
                    {errors.newpassword.message}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordModal(false);
                  }}
                  className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#0f6b7b] hover:bg-[#0d5f6f] px-5 py-2 text-xs font-bold text-white shadow-sm"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </>
  );
};

export default ChangePasswordModal;
