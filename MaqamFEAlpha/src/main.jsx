import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";
import { ToastContainer, Flip } from "react-toastify";
import store from "./components/stores/Store";
import { Provider } from "react-redux";
import { AuthProvider } from "./store/AuthProvider";
import { DataProvider } from "./store/DataProvider";
import { ThemeProvider } from "./context/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // CRM data must never be served stale: nothing is retained after a
      // component unmounts (gcTime 0) and every mount refetches from the
      // backend. Returning to a page always shows its loading state first.
      // refetchOnWindowFocus stays off: with staleTime 0 every mount already
      // refetches, so focus refetches only duplicated the same requests.
      gcTime: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchIntervalInBackground: false,
      staleTime: 0,
    },
  },
});

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
    <Provider store={store}>
      <AuthProvider>
        <DataProvider>
          <ThemeProvider>
            <ToastContainer limit={1} autoClose={2000} pauseOnHover theme="dark" transition={Flip} />
            <App />
          </ThemeProvider>
        </DataProvider>
      </AuthProvider>
    </Provider>
    </QueryClientProvider>
  </BrowserRouter>,
);
