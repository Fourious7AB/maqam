import { Mail, Lock, Eye, EyeOff, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import Loginimage from "../assets/login.jpg";
const ForgetPasswordPopModal = ({
  setShowLoginPopup,
  setShowRegisterPopup,
  setShowForgetPopup,
  setShowPassword,
  showPassword,
  setShowconfirmPassword,
  showconfirmPassword,
  setLoginUser,
  loginedUser,
  handleLogin,
  isLoading,
  setSubmitted,
}) => {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const onSubmit = (data) => {
    console.log("ForgetPasswordPopModal data Check", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-4xl mx-auto">
      <div className="w-full bg-white rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 border border-slate-100 font-poppins">
        {/* LEFT IMAGE SECTION */}
        <div
          className="relative bg-cover bg-center hidden md:flex flex-col items-center justify-center p-8 min-h-[450px] overflow-hidden"
          style={{
            backgroundImage: `url(${Loginimage})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-teal-950/90 via-teal-900/65 to-teal-950/60 backdrop-brightness-90"></div>

          <div className="relative z-10 text-white text-center flex flex-col items-center justify-center max-w-xs">
            <h1 className="text-3xl lg:text-4xl font-bold font-dancing tracking-wide drop-shadow-md">
              MAQAM TRAVEL
            </h1>
            <div className="w-12 h-0.5 bg-teal-400/60 my-3 rounded-full"></div>
            <p className="text-sm text-teal-100/90 font-poppins leading-relaxed drop-shadow">
              Travel is the only purchase that enriches you in ways beyond
              material wealth
            </p>
          </div>
        </div>

          {/* RIGHT LOGIN SECTION */}

          <div className="p-8 sm:p-10 flex flex-col justify-center bg-white font-poppins">
            <h2 className="text-3xl sm:text-4xl font-bold text-teal-600 text-center">
              Welcome To
            </h2>

            <p className="text-center text-gray-500 mt-2 mb-8">
              Forget Password
            </p>

            {/* EMAIL */}

            <label className="block text-sm font-medium text-gray-500 mb-2">
              Password
            </label>

            <div className="mb-4 relative">
              <Lock className="absolute left-3 top-4 text-teal-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                {...register("password", {
                  required: "Password is required",
                })}
                className="w-full pl-10 pr-4 py-3 border border-teal-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-teal-400"
              />
              {errors.password && (
                <p className="text-red-500 text-sm py-2">
                  {errors.password.message}
                </p>
              )}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-4 text-teal-400 hover:text-teal-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* PASSWORD */}
            <label className="block text-sm font-medium text-gray-500 mb-2">
              Confirm Password
            </label>
            <div className="mb-2 relative">
              <Lock className="absolute left-3 top-4 text-teal-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter confirm password"
                {...register("confirmpassword", {
                  required: "Confirm Password is required",
                })}
                className="w-full pl-10 pr-4 py-3 border border-teal-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-teal-400"
              />
              {errors.confirmpassword && (
                <p className="text-red-500 text-sm py-2">
                  {errors.confirmpassword.message}
                </p>
              )}
              <button
                type="button"
                onClick={() => ShowconfirmPassword(!showconfirmPassword)}
                className="absolute right-3 top-4 text-teal-400 hover:text-teal-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* <div
              className="text-right text-sm text-teal-500 mb-6 cursor-pointer"
              onClick={() => {
                setShowLoginPopup(false);
                setShowForgetPopup(true);
                setSubmitted(false);
              }}
            >
              Forgot your password?
            </div> */}

            {/* LOGIN BUTTON */}
            {isLoading ? (
              <button
                className="cursor-not-allowed w-full bg-teal-400 text-white py-3 rounded-lg font-semibold"
                disabled
              >
                Sign In...
              </button>
            ) : (
              <button
                className=" cursor-pointer w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-semibold"
                onClick={handleSubmit(onSubmit)}
              >
                Resend
                {/* {localStorage.getItem("accessToken") ? "Logout" : "Sign In"} */}
              </button>
            )}
          </div>
        </div>
    </form>
  );
};

export default ForgetPasswordPopModal;
