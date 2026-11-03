import { Navigate, Route, Routes, useParams } from "react-router-dom";

// Layouts
import AdminLayout from "../components/layout/AdminLayout";
import AuthLayout from "../layouts/AuthLayout";

// Route Guards
import ProtectedRoute from "./ProtectedRoute";
import { AuthProvider as AdminAuthProvider } from "../features/auth/authSlice";

// Authentication
import VerifyOTP from "../features/auth/pages/VerifyOTP";
import ForgotPassword from "../features/auth/pages/ForgotPassword";

// Dashboard
import Dashboard from "../features/dashboard/pages/Dashboard";

// CRM Console (unified workspace)
import CrmConsole from "../features/crm/CrmConsole";

// Leads & Sales
import Leads from "../features/leads/pages/Leads";
import LeadDetails from "../features/leads/pages/LeadDetails";
import Pipeline from "../features/leads/pages/Pipeline";
import Quotes from "../features/quotes/pages/Quotes";

// Packages
import Packages from "../features/packages/pages/Packages";
import CreatePackage from "../features/packages/pages/CreatePackage";
import EditPackage from "../features/packages/pages/EditPackage";
import PackageDetails from "../features/packages/pages/PackageDetails";
import CustomPackage from "../features/packages/pages/CustomPackage";

// Inventory
import TicketStock from "../features/inventory/flights/TicketStock";
import Hotels from "../features/inventory/hotels/Hotels";
import HotelsDirectory from "../features/inventory/hotels/HotelsDirectory";
import HotelDetailPage from "../features/inventory/hotels/HotelDetailPage";
import PendingStock from "../features/inventory/hotels/PendingStock";
import ApprovedStock from "../features/inventory/hotels/ApprovedStock";
import Offers from "../features/offers/pages/Offers";
import VisaDashboard from "../features/inventory/visa/pages/VisaDashboard";
import VisaApplications from "../features/inventory/visa/pages/VisaApplications";
import VisaApplicationDetails from "../features/inventory/visa/pages/VisaApplicationDetails";
import VisaGroups from "../features/inventory/visa/pages/VisaGroups";
import VisaGroupDetails from "../features/inventory/visa/pages/VisaGroupDetails";
import VisaInventory from "../features/inventory/visa/pages/VisaInventory";
import VisaInventoryForm from "../features/inventory/visa/pages/VisaInventoryForm";
import VisaInventoryDetails from "../features/inventory/visa/pages/VisaInventoryDetails";
import VisaCaseOfficers from "../features/inventory/visa/pages/VisaCaseOfficers";

// Bookings
import CreateBooking from "../features/bookings/pages/CreateBooking";
import ServiceBooking from "../features/bookings/pages/ServiceBooking";
import BookingDetails from "../features/bookings/pages/BookingDetails";
import PackageBookingManager from "../features/bookings/pages/PackageBookingManager";
import BookingSnapshotPage from "../features/bookings/pages/BookingSnapshotPage";
import BookingConfirmation from "../features/bookings/pages/BookingConfirmation";

// Customers
import Customers from "../features/customers/pages/Customers";
import CustomerDetails from "../features/customers/pages/CustomerDetails";

// Finance
import FinanceDashboard from "../features/finance/pages/FinanceDashboard";
import Transactions from "../features/finance/pages/Transactions";
import InvoicesList from "../features/finance/pages/InvoicesList";
// import Refunds from "../features/finance/pages/Refunds"; // Commented out per user request

// Reports
import Reports from "../features/reports/pages/Reports";

// Users
import UserDetails from "../features/users/pages/UserDetails";
import RolesPermissions from "../features/users/pages/RolesPermissions";
import UserManagement from "../features/users/pages/UserManagement";

// Profile
import AdminLogin from "../pages/AdminLogin";
import ProfilePage from "../pages/ProfilePage";

// Settings
import SettingsLayout from "../features/settings/components/SettingsLayout";
import GeneralSettings from "../features/settings/pages/GeneralSettings";
import HeroBannerSettings from "../features/settings/pages/HeroBannerSettings";
import FinancialSettings from "../features/settings/pages/FinancialSettings";
import MarkupSettings from "../features/settings/pages/MarkupSettings";
import AgencyGstSettings from "../features/settings/pages/AgencyGstSettings";
import TaxInvoiceCompliance from "../features/settings/pages/TaxInvoiceCompliance";
import BookingSettings from "../features/settings/pages/BookingSettings";
import NotificationSettings from "../features/settings/pages/NotificationSettings";
import OTPSettings from "../features/settings/pages/OTPSettings";
import AuditLogs from "../features/settings/pages/AuditLogs";

/**
 * Temporary placeholder for routes
 * that are planned but not yet implemented.
 */
function Placeholder({ title }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>

      <p className="mt-2 text-sm text-slate-500">
        Reserved for the next development phase.
      </p>
    </div>
  );
}

function CrmRedirect() {
  const { section } = useParams();
  const map = {
    hotels: "/admin/inventory/hotels",
    stock: "/admin/inventory/hotels/stock",
    packages: "/admin/packages",
    bookings: "/admin/bookings",
    staff: "/admin/users",
    customers: "/admin/customers",
    leads: "/admin/leads",
    pipeline: "/admin/pipeline",
    quotes: "/admin/quotes",
  };
  return <Navigate to={map[section] || "/admin/leads"} replace />;
}

/**
 * Admin routes are mounted by App.jsx under <Route path="/admin/*">.
 * All paths below are therefore RELATIVE so they resolve to /admin/...
 * (e.g. "dashboard" -> /admin/dashboard, "administrators/login" ->
 * /admin/administrators/login, matching ProtectedRoute's redirect).
 */
export default function AppRoutes() {
  return (
    <AdminAuthProvider>
      <Routes>
        {/* ============================================================
          AUTH ROUTES  (/admin/administrators/...)
      ============================================================ */}

        <Route element={<AuthLayout />}>
          <Route
            path="administrators/login"
            element={<AdminLogin />}
          />

          <Route path="verify-otp" element={<VerifyOTP />} />

          <Route path="forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* ============================================================
          PROTECTED ADMIN ROUTES  (/admin/...)
      ============================================================ */}

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            {/* Admin root */}
            <Route
              index
              element={<Navigate to="/admin/dashboard" replace />}
            />

            {/* ========================================================
              CRM WORKSPACE CONSOLE
          ======================================================== */}

            <Route path="crm" element={<CrmConsole />} />
            <Route path="crm/:section" element={<CrmConsole />} />

            {/* ========================================================
              DASHBOARD
          ======================================================== */}

            <Route path="dashboard" element={<Dashboard />} />

            {/* ========================================================
              LEADS & SALES
          ======================================================== */}

            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetails />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="quotes/:id" element={<Quotes />} />

            {/* ========================================================
              PACKAGES
          ======================================================== */}

            <Route path="packages" element={<Packages />} />

            <Route path="packages/create" element={<CreatePackage />} />

            <Route path="packages/custom" element={<CustomPackage />} />

            <Route path="packages/:id/edit" element={<EditPackage />} />

            <Route path="packages/:id" element={<PackageDetails />} />

            {/* ========================================================
              INVENTORY
          ======================================================== */}

            <Route path="inventory/flights" element={<TicketStock />} />

            <Route path="inventory/hotels" element={<HotelsDirectory />} />

            <Route
              path="inventory/hotels/:hotelId"
              element={<HotelDetailPage />}
            />

            <Route path="inventory/hotels/stock" element={<Hotels />} />

            <Route path="inventory/hotels/pending" element={<PendingStock />} />

            <Route
              path="inventory/hotels/approved"
              element={<ApprovedStock />}
            />

            <Route path="offers" element={<Offers />} />

            {/* Cars & insurance: catalogue entries reserved for the inventory
                explorer dropdown until their modules ship. */}
            <Route
              path="inventory/cars"
              element={<Placeholder title="Cars inventory" />}
            />

            <Route
              path="inventory/insurance"
              element={<Placeholder title="Insurance inventory" />}
            />

            <Route path="visa/dashboard" element={<VisaDashboard />} />
            <Route path="visa/applications" element={<VisaApplications />} />
            <Route path="visa/applications/:id" element={<VisaApplicationDetails />} />
            <Route path="visa/groups" element={<VisaGroups />} />
            <Route path="visa/groups/:id" element={<VisaGroupDetails />} />
            <Route path="visa/case-officers" element={<VisaCaseOfficers />} />
            <Route path="inventory/visa" element={<VisaInventory />} />
            <Route path="inventory/visa/create" element={<VisaInventoryForm />} />
            <Route path="inventory/visa/:id/edit" element={<VisaInventoryForm />} />
            <Route path="inventory/visa/:id" element={<VisaInventoryDetails />} />

            {/* ========================================================
              BOOKINGS
          ======================================================== */}

            <Route path="bookings" element={<PackageBookingManager />} />

            <Route path="bookings/create" element={<CreateBooking />} />

            <Route
              path="bookings/create-service"
              element={<ServiceBooking />}
            />

            <Route
              path="bookings/confirmation"
              element={<BookingConfirmation />}
            />

            <Route
              path="bookings/:id/snapshot"
              element={<BookingSnapshotPage />}
            />

            <Route path="bookings/:id" element={<BookingDetails />} />

            {/* ========================================================
              CUSTOMERS
          ======================================================== */}

            <Route path="customers" element={<Customers />} />

            <Route path="customers/:id" element={<CustomerDetails />} />

            {/* ========================================================
              USERS & STAFF
          ======================================================== */}

            <Route path="users" element={<UserManagement />} />

            <Route path="users/roles" element={<RolesPermissions />} />

            <Route path="users/:id" element={<UserDetails />} />

            {/* ========================================================
              PROFILE
          ======================================================== */}

            <Route path="profile" element={<ProfilePage />} />

            {/* ========================================================
              FINANCE
          ======================================================== */}

            <Route path="finance" element={<FinanceDashboard />} />

            <Route path="finance/transactions" element={<Transactions />} />
            <Route path="finance/invoices" element={<InvoicesList />} />

            {/* <Route path="finance/refunds" element={<Refunds />} /> */}{/* Commented out per user request */}

            {/* ========================================================
              REPORTS
          ======================================================== */}

            <Route path="reports" element={<Reports />} />

            {/* ========================================================
              SETTINGS
          ======================================================== */}

            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="markup" replace />} />
              <Route path="markup" element={<MarkupSettings />} />
              <Route path="agency-gst" element={<AgencyGstSettings />} />
              <Route path="gst" element={<Navigate to="/admin/settings/agency-gst" replace />} />
              <Route path="financial" element={<Navigate to="/admin/settings/markup" replace />} />
              <Route path="general" element={<GeneralSettings />} />
              <Route path="booking" element={<BookingSettings />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="invoices" element={<TaxInvoiceCompliance />} />
              <Route path="hero-banner" element={<HeroBannerSettings />} />
              <Route path="otp" element={<OTPSettings />} />
              <Route path="roles" element={<RolesPermissions />} />
              <Route path="audit-logs" element={<AuditLogs />} />
            </Route>

            {/* ========================================================
              FUTURE
          ======================================================== */}

            <Route
              path="quotes"
              element={
                <Placeholder title="Quotes — future Lead/Sales extension" />
              }
            />

            {/* Admin catch-all: unknown /admin paths land on the dashboard */}
            <Route
              path="*"
              element={<Navigate to="/admin/dashboard" replace />}
            />
          </Route>
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
