import { useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CheckCircle2, Home, LogOut, X } from "lucide-react";
import Login from "../components/Login";
import HeroWallpaper from "../assets/hero-slider/slide2-madinah-prophet-mosque.jpg";
import { useAuth } from "../store/authContext";
import LumaSpin from "../components/ui/LumaSpin";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || location.state?.from?.pathname || "/";
  const { isAuthenticated, user, loading, logout: authLogout } = useAuth();
  const wasAlreadyAuth = useRef(isAuthenticated);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (wasAlreadyAuth.current) {
        toast.info("You are already logged in!");
      }
      navigate(redirectPath, { replace: true });
    }
  }, [loading, isAuthenticated, navigate, redirectPath]);

  // Support Escape key to close/exit login page matching modal closing behavior
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        navigate(redirectPath && redirectPath !== "/login" ? redirectPath : "/");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, redirectPath]);

  const handleClose = () => {
    navigate(redirectPath && redirectPath !== "/login" ? redirectPath : "/");
  };

  if (loading) {
    return (
      <main className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
        <img
          src={HeroWallpaper}
          alt="Maqam pilgrimage destination backdrop"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#041410]/90 via-[#08221b]/80 to-[#020b08]/92" />
        <div className="relative z-10">
          <LumaSpin
            size="lg"
            variant="brand"
            showProgress={true}
            text="Verifying session..."
            subtext="Checking authentication status..."
          />
        </div>
      </main>
    );
  }

  if (isAuthenticated) {
    return (
      <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 font-poppins overflow-hidden">
        <img
          src={HeroWallpaper}
          alt="Maqam pilgrimage destination backdrop"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#041410]/90 via-[#08221b]/80 to-[#020b08]/92" />
        <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#0c1a16] rounded-3xl border border-white/40 dark:border-white/15 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.4)] text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs border border-emerald-500/20">
            <CheckCircle2 size={30} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Already Logged In
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              You are currently signed in as{" "}
              <strong className="text-slate-900 dark:text-white font-semibold">
                {user?.firstName
                  ? `${user.firstName} ${user.lastName || ""}`
                  : user?.phone || "Authorized User"}
              </strong>
              . Redirecting to home...
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Home size={15} />
              <span>Go to Home</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await authLogout();
                toast.success("Logged out successfully");
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-rose-300/50 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold transition cursor-pointer"
            >
              <LogOut size={15} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isVisaLogin = Boolean(
    redirectPath?.toLowerCase().includes("visa") ||
    searchParams.get("source") === "visa"
  );
  const showNeedHelp = !isVisaLogin;

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 font-poppins overflow-hidden">
      {/* Full-bleed scenic background */}
      <img
        src={HeroWallpaper}
        alt="Maqam pilgrimage destination backdrop"
        className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none"
      />

      {/* Dark translucent emerald & slate gradient veil */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#03140f]/92 via-[#06221a]/82 to-[#020b08]/94 pointer-events-none" />

      {/* Glass card wrapper matching redesign dimensions */}
      <div className="relative z-10 w-full max-w-[880px] lg:max-w-[940px] xl:max-w-[960px] mx-auto">
        <Login
          presentation="page"
          showNeedHelp={showNeedHelp}
          isLoading={false}
          setShowLoginPopup={handleClose}
          setShowRegisterPopup={() => navigate("/registration")}
          setShowForgetPopup={() => navigate("/")}
          redirectPath={redirectPath}
        />
      </div>
    </main>
  );
};

export default LoginPage;
