import React, { useEffect, useRef, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "../../store/authContext";
import LumaSpin from "../ui/LumaSpin";

import HeroWallpaper from "../../assets/hero-slider/slide2-madinah-prophet-mosque.jpg";

const Login = lazy(() => import("../Login"));
const Register = lazy(() => import("../../pages/Register"));

export default function AuthModal() {
  const { authModal, closeAuthModal, setAuthModal, isAuthenticated } = useAuth();
  const overlayRef = useRef(null);

  // Close modal when already authenticated and no onSuccess callback is pending
  useEffect(() => {
    if (isAuthenticated && authModal?.isOpen && !authModal?.onSuccess) {
      closeAuthModal();
    }
  }, [isAuthenticated, authModal?.isOpen, authModal?.onSuccess, closeAuthModal]);

  // Lock body scroll while modal is active & listen to Escape key
  useEffect(() => {
    if (!authModal?.isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeAuthModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [authModal?.isOpen, closeAuthModal]);

  if (!authModal?.isOpen) {
    return null;
  }

  const handleBackdropClick = (e) => {
    if (overlayRef.current && e.target === overlayRef.current) {
      closeAuthModal();
    }
  };

  const handleAuthSuccess = (res) => {
    if (typeof authModal.onSuccess === "function") {
      try {
        authModal.onSuccess(res);
      } catch (err) {
        console.error("AuthModal onSuccess callback error:", err);
      }
    }
    closeAuthModal();
  };

  const isVisaModal = Boolean(
    authModal.source === "visa" ||
    authModal.redirectPath?.toLowerCase().includes("visa")
  );
  const showNeedHelp = !isVisaModal;

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Account Authentication"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto transition-all duration-300 animate-in fade-in"
    >
      {/* Full-bleed scenic wallpaper backdrop matching Profile login */}
      <img
        src={HeroWallpaper}
        alt="Maqam pilgrimage destination backdrop"
        className="fixed inset-0 w-full h-full object-cover scale-105 pointer-events-none"
      />

      {/* Dark translucent emerald & slate gradient veil matching Profile login */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#03140f]/92 via-[#06221a]/82 to-[#020b08]/94 pointer-events-none" />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-[880px] lg:max-w-[940px] xl:max-w-[960px] mx-auto">
        {showNeedHelp && (
          <div className="flex justify-end mb-2.5">
            <Link
              to="/booking-help"
              onClick={closeAuthModal}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20 text-xs font-semibold backdrop-blur-sm transition active:scale-95 shadow-sm"
            >
              <span>Need help?</span>
            </Link>
          </div>
        )}

        <Suspense
          fallback={
            <div className="rounded-[32px] bg-white dark:bg-slate-900 p-12 shadow-2xl flex items-center justify-center">
              <LumaSpin
                size="lg"
                variant="emerald"
                showProgress={true}
                text="Wait user, we are loading your page..."
                subtext="Loading secure authentication form…"
              />
            </div>
          }
        >
          {authModal.view === "register" ? (
            <div className="relative overflow-hidden rounded-[32px] bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8">
              <button
                type="button"
                onClick={closeAuthModal}
                className="absolute top-4 right-4 z-40 flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer border border-slate-200/70"
                aria-label="Close"
              >
                <X size={16} />
              </button>
              <Register
                setShowLoginPopup={() =>
                  setAuthModal((prev) => ({ ...prev, view: "login" }))
                }
                setShowRegisterPopup={closeAuthModal}
                onSuccess={handleAuthSuccess}
                redirectPath={authModal.redirectPath}
              />
            </div>
          ) : (
            <Login
              presentation="popup"
              setShowLoginPopup={closeAuthModal}
              setShowRegisterPopup={() =>
                setAuthModal((prev) => ({ ...prev, view: "register" }))
              }
              onSuccess={handleAuthSuccess}
              redirectPath={authModal.redirectPath}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
