import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../stores/api";

export const fetchFlights = createAsyncThunk(
  "flightSearch/fetchFlights",
  async (searchParams, { rejectWithValue }) => {
    try {
      const cleanParams = { ...searchParams };
      delete cleanParams?.forceRefresh;

      const response = await api.post("/api/v1/flights/search", cleanParams);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

const normalizeSrdvParams = (params = {}) => {
  const rawTraceId = params?.traceId ?? params?.TraceId ?? "";
  const rawResultIndex = params?.resultIndex ?? params?.ResultIndex ?? "";
  const normalizedResultIndex = Array.isArray(rawResultIndex)
    ? String(rawResultIndex[0] ?? "").trim()
    : String(rawResultIndex ?? "").trim();

  return {
    traceId: String(rawTraceId ?? "").trim(),
    resultIndex: normalizedResultIndex,
  };
};

export const getFareQuote = createAsyncThunk(
  "flightSearch/getFareQuote",
  async (farequote, { rejectWithValue }) => {
    try {
      const payload = normalizeSrdvParams(farequote);
      if (!payload.traceId || !payload.resultIndex) {
        return rejectWithValue("Missing flight traceId or resultIndex. Please re-select a flight.");
      }
      const response = await api.post("/api/v1/flights/farequote", payload, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const rawMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Fare quote validation error";

      const is502 = status === 502;
      const isExpired =
        is502 ||
        /expired|trace|session|not found|bad gateway|srdv/i.test(String(rawMsg));

      let userFacingMsg = rawMsg;
      if (is502 || isExpired) {
        userFacingMsg =
          "Flight fare session expired (airline holds valid for 10-15 mins). Please refresh your search.";
      }

      return rejectWithValue({
        message: userFacingMsg,
        rawMessage: rawMsg,
        status: status || 500,
        is502,
        isExpired,
      });
    }
  },
);

export const getSeatMap = createAsyncThunk(
  "flightSearch/getSeatMap",
  async (params, { rejectWithValue }) => {
    try {
      const payload = normalizeSrdvParams(params);
      const response = await api.post("/api/v1/flights/seatmap", payload, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data;
    } catch (error) {
      console.warn("Seat map unavailable:", error.response?.data?.message || error.message);
      return {
        success: true,
        data: {
          seatLayout: [],
          segments: [],
          isAvailable: false,
          message: error.response?.data?.message || "Seat map not available for this flight",
        },
      };
    }
  },
);

export const getSSR = createAsyncThunk(
  "flightSearch/getSSR",
  async (params, { rejectWithValue }) => {
    try {
      const payload = normalizeSrdvParams(params);
      const response = await api.post("/api/v1/flights/ssr", payload, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data;
    } catch (error) {
      console.warn("SSR unavailable:", error.response?.data?.message || error.message);
      return {
        success: true,
        data: {
          baggage: [],
          meals: [],
          standardMeals: [],
          isAvailable: false,
          message: error.response?.data?.message || "SSR not available for this flight",
        },
      };
    }
  },
);

const flightSearchSlice = createSlice({
  name: "flightSearch",
  initialState: {
    flightsData: [],
    fareQuote: null,
    seatMapData: null,
    ssrData: null,
    loading: false,
    fareQuoteLoading: false,
    seatMapLoading: false,
    ssrLoading: false,
    error: null,
    fareQuoteError: null,
    fareQuoteErrorMeta: null,
    seatMapError: null,
    ssrError: null,
  },
  reducers: {
    hydrateFlightData: (state, action) => {
      state.flightsData = action.payload;
      state.loading = false;
      state.error = null;
    },
    resetBookingState: (state) => {
      state.fareQuote = null;
      state.seatMapData = null;
      state.ssrData = null;
      state.fareQuoteError = null;
      state.fareQuoteErrorMeta = null;
      state.seatMapError = null;
      state.ssrError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFlights.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFlights.fulfilled, (state, action) => {
        state.loading = false;
        state.flightsData = action.payload;
      })
      .addCase(fetchFlights.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // getFareQuote
      .addCase(getFareQuote.pending, (state) => {
        state.fareQuoteLoading = true;
        state.fareQuote = null;
        state.fareQuoteError = null;
        state.fareQuoteErrorMeta = null;
      })
      .addCase(getFareQuote.fulfilled, (state, action) => {
        state.fareQuoteLoading = false;
        state.fareQuote = action.payload;
        state.fareQuoteError = null;
        state.fareQuoteErrorMeta = null;
      })
      .addCase(getFareQuote.rejected, (state, action) => {
        state.fareQuoteLoading = false;
        state.fareQuote = null;
        state.fareQuoteError =
          typeof action.payload === "string"
            ? action.payload
            : action.payload?.message || "Fare quote validation error";
        state.fareQuoteErrorMeta =
          typeof action.payload === "object" ? action.payload : null;
      })
      // getSeatMap
      .addCase(getSeatMap.pending, (state) => {
        state.seatMapLoading = true;
        state.seatMapData = null;
        state.seatMapError = null;
      })
      .addCase(getSeatMap.fulfilled, (state, action) => {
        state.seatMapLoading = false;
        state.seatMapData = action.payload;
        state.seatMapError = null;
      })
      .addCase(getSeatMap.rejected, (state, action) => {
        state.seatMapLoading = false;
        state.seatMapData = {
          success: true,
          data: { seatLayout: [], segments: [], isAvailable: false },
        };
        state.seatMapError = null;
      })
      // getSSR
      .addCase(getSSR.pending, (state) => {
        state.ssrLoading = true;
        state.ssrData = null;
        state.ssrError = null;
      })
      .addCase(getSSR.fulfilled, (state, action) => {
        state.ssrLoading = false;
        state.ssrData = action.payload;
        state.ssrError = null;
      })
      .addCase(getSSR.rejected, (state, action) => {
        state.ssrLoading = false;
        state.ssrData = {
          success: true,
          data: { baggage: [], meals: [], standardMeals: [], isAvailable: false },
        };
        state.ssrError = null;
      });
  },
});

export const { hydrateFlightData, resetBookingState } = flightSearchSlice.actions;
export default flightSearchSlice.reducer;

