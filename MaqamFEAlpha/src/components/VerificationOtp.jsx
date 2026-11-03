import Loginimage from "../assets/login.jpg";
import { Phone, ArrowLeft, Ticket } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
const VerificstionOtp = ({
  setShowLoginPopup,
  setShowRegisterPopup,
  setShowForgetPopup,
  setShowVerificationPopup,
  setConfirmpasswordchange,
  setShowPassword,
  showPassword,
  setLoginUser,
  loginedUser,
  handleLogin,
  isLoading,
  submitted,
  setSubmitted,
  reset_Token,
}) => {
  const dispatch = useDispatch();

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const onSubmit = (data) => {
    console.log("data", data);
    setConfirmpasswordchange(true);
  };
  return (
    <div className="w-full flex items-center justify-center font-poppins">
      <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 border border-slate-100">
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
              Don't worry! We'll help you reset your password in no time
            </p>
          </div>
        </div>

        {/* RIGHT FORGOT PASSWORD SECTION */}
        <div className="p-8 sm:p-10 flex flex-col justify-center bg-white font-poppins">
          {/* Back Button */}
          <button
            onClick={() => {
              setShowVerificationPopup(false);
              setShowForgetPopup(false);
              setShowLoginPopup(false);
            }}
            className="flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-6 w-fit cursor-pointer transition duration-200"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">Back to Login</span>
          </button>

          <h2 className="text-3xl sm:text-4xl font-bold text-teal-600 text-center">
            Otp Verification
          </h2>

          <p className="text-center text-gray-500 mt-2 mb-8">
            Enter your reset token for otp Verification
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* EMAIL INPUT */}
              <div className="mb-6 relative">
                <Ticket
                  className="absolute left-3 top-4 text-teal-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Enter your reset token"
                  {...register("reset_token", {
                    required: "Reset Token Required",
                  })}
                  className="w-full pl-10 pr-4 py-3 border border-teal-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-teal-400"
                />
                {errors?.reset_token && (
                  <p className="text-red-500 text-sm py-2">
                    {errors.reset_token.message}
                  </p>
                )}
              </div>

              {/* SUBMIT BUTTON */}

              {isLoading ? (
                <button
                  type="button"
                  className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold cursor-pointer transition duration-200"
                  disabled
                >
                  Send Reset Link....
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-semibold cursor-pointer transition duration-200"
                >
                  Verify
                </button>
              )}
            </form>
          ) : (
            <div className="text-center">
              <div className="mb-4 text-green-600">
                <svg
                  className="w-16 h-16 mx-auto mb-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-teal-600 mb-2">
                Check Your Email
              </h3>
              <p className="text-gray-500 mb-6">
                We've sent a password reset link to{" "}
                <span className="font-semibold">{email}</span>
              </p>
              <p className="text-sm text-gray-400 mb-6">
                If you don't see it, check your spam folder
              </p>
              <button
                onClick={() => {
                  setShowVerificationPopup(false);
                  setShowLoginPopup(false);
                }}
                className="w-full block bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-semibold cursor-pointer transition duration-200"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* REGISTER LINK */}
          {!submitted && (
            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?
              <button
                onClick={() => {
                  setShowForgetPopup(false);
                  setShowRegisterPopup(true);
                }}
                className="text-teal-600 font-semibold cursor-pointer ml-1"
              >
                {" "}
                Sign Up Now
              </button>
            </p>
          )}
        </div>
      </div>

      {}
    </div>
  );
};

export default VerificstionOtp;
