import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../reducer/AuthSlice";
import flightSearchReducer from "../reducer/FlightSearchSlice";
import getFareQuoteReducer from "../reducer/FlightSearchSlice";
import hotelSearchReducer from "../reducer/HotelSearchSlice";
import regionSlice from "../reducer/NationalismSlice";
import { tokenService } from "../../admin/services/tokenService";

const store = configureStore({
  reducer: {
    auth: authReducer,
    flightSearch: flightSearchReducer,
    getFareQuote: getFareQuoteReducer,
    hotelSearch: hotelSearchReducer,
    region: regionSlice,
  },
});

if (typeof window !== "undefined") {
  window.addEventListener("maqam:session-expired", () => {
    queueMicrotask(() => {
      try {
        const auth = store.getState().auth;
        if (auth?.isAuthenticated || auth?.token || auth?.user) {
          store.dispatch({ type: "auth/clearAuth" });
        }
      } catch (err) {
        console.warn("Session expired handler error:", err);
      }
    });
  });

  // Keep Redux in real-time sync with central tokenService (e.g. silent refresh updates)
  tokenService.subscribe((snapshot) => {
    queueMicrotask(() => {
      try {
        const currentToken = store.getState().auth?.token;
        if (snapshot.accessToken && snapshot.accessToken !== currentToken) {
          store.dispatch({
            type: "auth/setAuthSession",
            payload: {
              token: snapshot.accessToken,
              accessToken: snapshot.accessToken,
              user: snapshot.userProfile,
            },
          });
        } else if (!snapshot.accessToken && !tokenService.getAccessToken() && (currentToken || store.getState().auth?.isAuthenticated)) {
          store.dispatch({ type: "auth/clearAuth" });
        }
      } catch (err) {
        console.warn("Store token listener error:", err);
      }
    });
  });
}

export default store;
