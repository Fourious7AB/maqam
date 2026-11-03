// -----------------------------------------------------------------------------
// hotelierContext — the React context object + the hook that reads it.
//
// Kept in its own component-free module on purpose: it lets HotelierProvider
// live in a file that ONLY exports a component, which is what Vite's fast
// refresh needs (react-refresh/only-export-components). Screens import
// `useHotelierData` from here; the provider imports the context object from here.
// -----------------------------------------------------------------------------
import { createContext, useContext } from "react";

export const HotelierDataContext = createContext(null);

// Convenience hook. Throws a clear error if used outside the provider.
export function useHotelierData() {
  const ctx = useContext(HotelierDataContext);
  if (!ctx) {
    throw new Error("useHotelierData must be used inside <HotelierProvider>");
  }
  return ctx;
}
