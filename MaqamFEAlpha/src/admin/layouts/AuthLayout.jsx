import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900">
      <div className="grid min-h-screen place-items-center p-4">
        <Outlet />
      </div>
    </div>
  );
}