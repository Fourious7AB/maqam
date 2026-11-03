import React from "react";
import { AlertTriangle, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Error = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-indigo-50 p-6">

      <div className="bg-white shadow-xl rounded-2xl p-10 text-center max-w-lg w-full">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 p-5 rounded-full">
            <AlertTriangle className="text-red-500" size={40} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 mb-3">
          {/* Oops! Something went wrong */}
          Under Development
        </h1>

        {/* Description */}
        <p className="text-gray-500 mb-8">
          The page you are looking for might have been under development
          {/* had its name changed, or is temporarily unavailable. */}
        </p>

        {/* Buttons */}
        <div className="flex justify-center gap-4">

          <button
            onClick={() => navigate("/")}
            className=" cursor-pointer flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <Home size={18} />
            Go Home
          </button>

          <button
            onClick={() => window.location.reload()}
            className="border border-gray-300 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition cursor-pointer"
          >
            Retry
          </button>

        </div>
      </div>
    </div>
  );
};

export default Error;
