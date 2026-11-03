import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LumaPageLoader from "./components/ui/LumaPageLoader";
import FlightLoader from "./components/loader/FlightLoader";
import HotelLoader from "./components/loader/HotelLoader";
import AuthModal from "./components/auth/AuthModal";
import FlightCard from "./components/FlightList";

// Public Pages (Code-split with React.lazy to reduce initial bundle & reload latency)
const Home = lazy(() => import("./pages/Home"));
const Search = lazy(() => import("./pages/Search"));
const HotelDetails = lazy(() => import("./pages/HotelDetails"));
const HotelBookingDetails = lazy(() => import("./pages/HotelBookingDetails"));
const SelectedRoomInformation = lazy(() => import("./pages/SelectedRoomInformation"));
const Hotel = lazy(() => import("./pages/Hotel"));
const HotelPage = lazy(() => import("./pages/HotelPage"));
const PackagePage = lazy(() => import("./pages/PackagePage"));
const PackageDetail = lazy(() => import("./pages/PackageDetail"));
const AIPackageGenerator = lazy(() => import("./components/alplanner/AIPlanner"));
const Flight = lazy(() => import("./pages/Flight"));
const Error = lazy(() => import("./pages/Error"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const TermsAndConditions = lazy(() => import("./pages/Terms&Conditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Contact = lazy(() => import("./pages/Contact"));
const BookingHelp = lazy(() => import("./pages/BookingHelp"));
const Resetpassword = lazy(() => import("./pages/Resetpassword"));
const FareQuoteDetails = lazy(() => import("./pages/FareQuoteDetails"));
const FlightBookingSuccess = lazy(() => import("./pages/FlightBookingSuccess"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const PaymentCancelPage = lazy(() => import("./pages/PaymentCancelPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const CommonFlightHotelSearchBox = lazy(() =>
  import("./components/commonflighthotelsearchbox/CommonFlightHotelSearchBox")
);
const CabBookingForm = lazy(() => import("./components/cabbookingform/CabBookingForm"));
const VisaCard = lazy(() => import("./components/visacard/VisaCard"));
const VisaCountries = lazy(() => import("./components/visacountries/VisaCountries"));
const CountryVisaDetail = lazy(() => import("./pages/CountryVisaDetail"));
const LeadForm = lazy(() => import("./components/LeadForm"));
const Dashboard = lazy(() => import("./pages/DashboardView"));
const Food = lazy(() => import("./components/food"));
const GuidesDirectory = lazy(() => import("./components/guides/GuidesDirectory"));
const GuideProfilePage = lazy(() => import("./components/guides/GuideProfilePage"));
const Insurance = lazy(() => import("./components/Insurance"));
const Bookings = lazy(() => import("./components/Bookings"));
const LoginPage = lazy(() => import("./pages/LoginPage"));

// Admin Portal (Heavy CRM and Management modules isolated into separate chunk)
const AdminRoutes = lazy(() => import("./admin/routes/AppRoutes"));

// Hotelier Dashboard (Portal isolated into separate chunk)
import HotelierRoleRoute from "./hotalier/components/HotelierRoleRoute";
const HotelierLayout = lazy(() => import("./hotalier/components/HotelierLayout.jsx"));
const HotelierDashboard = lazy(() => import("./hotalier/pages/HotelierDashboard.jsx"));
const AddRoom = lazy(() => import("./hotalier/pages/AddRoom.jsx"));
const RoomAvailability = lazy(() => import("./hotalier/pages/RoomAvailability.jsx"));
const HotelierProfile = lazy(() => import("./hotalier/pages/Profile.jsx"));

// Floating AI Assistant
const NoorAssistant = lazy(() => import("./components/ai/NoorAssistant"));

const App = () => {
  return (
    <>
      <Suspense fallback={<LumaPageLoader text="Loading..." />}>
        <Routes>
          {/* Admin routes — isolated under /admin/* so their <Routes> never
              conflicts with public routes and won't log "No routes matched" */}
          <Route path="/admin/*" element={<AdminRoutes />} />

          {/* Alias: several redirects (ProtectedRoute, VerifyOTP, hotelier
              sidebar) point at the bare /administrators/login path while the
              admin portal lives under /admin/*. Send it to the real login. */}
          <Route
            path="/administrators/login"
            element={<Navigate to="/admin/administrators/login" replace />}
          />

          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/register" element={<Register />} />
          <Route path="/registration" element={<Register />} />
          <Route path="/Register" element={<Register />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/details/:id" element={<HotelDetails />} />
          <Route path="/booking-details/:id" element={<HotelBookingDetails />} />
          <Route
            path="/selected-room-information"
            element={<SelectedRoomInformation />}
          />
          <Route path="/profile" element={<Profile />} />
          <Route path="/package-page" element={<PackagePage />} />
          <Route path="/package-detail/:id" element={<PackageDetail />} />
          <Route path="/packages/:id" element={<PackageDetail />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/ai-package-generator" element={<AIPackageGenerator />} />
          <Route
            path="/hotel"
            element={
              <Suspense fallback={<HotelLoader />}>
                <Hotel />
              </Suspense>
            }
          />
          <Route
            path="/hotel-page"
            element={
              <Suspense fallback={<HotelLoader />}>
                <HotelPage />
              </Suspense>
            }
          />
          <Route
            path="/flight"
            element={
              <Suspense fallback={<FlightLoader />}>
                <Flight />
              </Suspense>
            }
          />
          <Route path="/fare-quote-details" element={<FareQuoteDetails />} />
          <Route path="/flight/reviewDetails" element={<FareQuoteDetails />} />
          <Route
            path="/flight-booking-success"
            element={<FlightBookingSuccess />}
          />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment/paypal/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/paypal/cancel" element={<PaymentCancelPage />} />
          <Route path="/my-bookings" element={<Navigate to="/profile?tab=my-bookings" replace />} />
          <Route path="/account/travellers" element={<Navigate to="/profile?tab=co-travellers" replace />} />
          <Route path="/customer-care" element={<Navigate to="/profile?tab=customer-care" replace />} />
          <Route path="/quotes" element={<Navigate to="/profile?tab=customer-care" replace />} />
          <Route path="/track-quote" element={<Navigate to="/profile?tab=customer-care" replace />} />
          <Route path="/request-quote" element={<Navigate to="/profile?tab=customer-care" replace />} />
          <Route
            path="/common-flighthotel-searchbox"
            element={<CommonFlightHotelSearchBox />}
          />
          <Route
            path="/flight-list"
            element={
              <Suspense fallback={<FlightLoader />}>
                <FlightCard />
              </Suspense>
            }
          />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/booking-help" element={<BookingHelp />} />
          <Route path="/resetpassword/:token" element={<Resetpassword />} />
          <Route path="/cab-bookng-form" element={<CabBookingForm />} />
          <Route path="/visa-card" element={<VisaCard />} />
          <Route path="/visa-countries" element={<VisaCountries />} />
          <Route path="/visa/:countrySlug" element={<CountryVisaDetail />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leadfrom" element={<LeadForm />} />

          <Route path="/food" element={<Food />} />
          <Route path="/guide" element={<Navigate to="/guides" replace />} />
          <Route path="/guides" element={<GuidesDirectory />} />
          <Route path="/guides/:id" element={<GuideProfilePage />} />
          <Route path="/insurance" element={<Insurance />} />

          {/* Hotelier Dashboard — roles "hotelier" and "admin" only (guard below).
              Admin CRM owns /admin/* via <AdminRoutes /> above. Match those
              paths here with an empty element so the 404 catch-all below never
              renders underneath admin pages. */}
          <Route
            path="/hotelier"
            element={
              <HotelierRoleRoute>
                <HotelierLayout />
              </HotelierRoleRoute>
            }
          >
            <Route index element={<HotelierDashboard />} />
            <Route path="profile" element={<HotelierProfile />} />
            <Route path="rooms" element={<RoomAvailability />} />
            <Route path="rooms/add" element={<AddRoom />} />
            <Route path="bookings" element={<Navigate to="/hotelier" replace />} />
            <Route path="room-types" element={<Navigate to="/hotelier" replace />} />
            <Route path="facilities" element={<Navigate to="/hotelier" replace />} />
            <Route path="services" element={<Navigate to="/hotelier" replace />} />
            <Route path="settlement" element={<Navigate to="/hotelier" replace />} />
            <Route path="cab-bookings" element={<Navigate to="/hotelier" replace />} />
            <Route path="cars" element={<Navigate to="/hotelier" replace />} />
          </Route>
          <Route path="/admin/*" element={null} />
          <Route path="*" element={<Error />} />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        <NoorAssistant />
      </Suspense>
      <AuthModal />
    </>
  );
};

export default App;
