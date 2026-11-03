import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import CommonHeader from "../components/CommonHeader";
import { UserAPI } from "../configs/api";

const Resetpassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  console.log("Token:", token); // 👉 for testing, remove in production
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const err = {};

    if (!form.password) {
      err.password = "Enter password";
      toast.error("Password is required");
    }

    if (!form.confirmPassword) {
      err.confirmPassword = "Confirm password is required";
      toast.error("Confirm password is required");
    }

    if (
      form.password &&
      form.confirmPassword &&
      form.password !== form.confirmPassword
    ) {
      err.confirmPassword = "Passwords do not match";
      toast.error("Passwords do not match");
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;
    setIsLoading(true);

    try {
      const payload = { password: form.password };
      const response = await fetch(`${UserAPI.UserResetPasswordApi}/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Password reset successfully!" || result.message);
        setForm({ password: "", confirmPassword: "" });
        setIsLoading(false);
        navigate("/");
      } else {
        toast.error(
          "Failed to reset password. Please try again." || result.message,
        );
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("An error occurred. Please try again." || error.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <CommonHeader title="Reset Password" />
      <div className=" flex items-center justify-center  p-6 font-poppins ">
        {/* Glass Card */}
        <div className="backdrop-blur-xl bg-white border border-white/40 shadow-2xl rounded-3xl p-8 w-full max-w-md">
          {/* Header */}
          <h2 className="text-3xl font-bold text-teal-800 text-center mb-2">
            Reset Password
          </h2>

          <p className="text-center text-gray-600 mb-6 text-sm">
            Create a new secure password
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-4 text-teal-500" size={18} />

              <input
                type={show ? "text" : "password"}
                name="password"
                placeholder="New Password"
                value={form.password}
                onChange={handleChange}
                className="peer w-full pl-10 pr-10 py-3 bg-white/60 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-teal-400"
              />

              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-4 text-teal-500 cursor-pointer"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-4 text-teal-500" size={18} />

              <input
                type={show ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="peer w-full pl-10 py-3 bg-white/60 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-teal-400"
              />
            </div>

            {/* Button */}
            {isLoading ? (
              <button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-semibold transition cursor-pointer"
                disabled
              >
                Reset Password...
              </button>
            ) : (
              <button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-semibold transition cursor-pointer"
                type="submit"
              >
                Reset Password
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default Resetpassword;
