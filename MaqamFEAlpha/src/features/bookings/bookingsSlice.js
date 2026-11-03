import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockBookings } from "../../data/booking";
import { BASE_URL } from "../../configs/api";

const API_URL = `${BASE_URL}/api/v1`;

/*
|--------------------------------------------------------------------------
| Initial State
|--------------------------------------------------------------------------
*/

const initialState = {
  bookings: [],
  selectedBooking: null,

  loading: false,
  detailsLoading: false,

  error: null,
  detailsError: null,

  useMockData: true,
};

/*
|--------------------------------------------------------------------------
| GET BOOKINGS
|--------------------------------------------------------------------------
|
| Later your backend can expose:
|
| GET /bookings
|
| Search:
|
| GET /bookings?search=Mohammed
|
| GET /bookings?search=USR-20251
|
*/

export const fetchBookings = createAsyncThunk(
  "bookings/fetchBookings",

  async (params = {}, { rejectWithValue }) => {
    try {
      /*
       * TEMPORARY DEVELOPMENT MODE
       *
       * Set useMockData to false when your backend is ready.
       */

      if (params.useMockData !== false) {
        return mockBookings;
      }

      const queryParams = new URLSearchParams();

      if (params.search) {
        queryParams.append("search", params.search);
      }

      if (params.status && params.status !== "All") {
        queryParams.append("status", params.status);
      }

      if (params.type && params.type !== "All") {
        queryParams.append("type", params.type);
      }

      const queryString = queryParams.toString();

      const url = queryString
        ? `${API_URL}/bookings?${queryString}`
        : `${API_URL}/bookings`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch bookings. Status: ${response.status}`
        );
      }

      const data = await response.json();

      /*
       * Supports either:
       *
       * {
       *   bookings: [...]
       * }
       *
       * OR
       *
       * [...]
       */

      return data.bookings || data;
    } catch (error) {
      return rejectWithValue(
        error.message || "Unable to load bookings."
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET SINGLE BOOKING
|--------------------------------------------------------------------------
|
| Later:
|
| GET /bookings/:id
|
*/

export const fetchBookingById = createAsyncThunk(
  "bookings/fetchBookingById",

  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${API_URL}/bookings/${bookingId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch booking. Status: ${response.status}`
        );
      }

      const data = await response.json();

      return data.booking || data;
    } catch (error) {
      return rejectWithValue(
        error.message || "Unable to load booking."
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE BOOKING STATUS
|--------------------------------------------------------------------------
|
| Later:
|
| PATCH /bookings/:id/status
|
*/

export const updateBookingStatus = createAsyncThunk(
  "bookings/updateBookingStatus",

  async (
    { bookingId, status },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/bookings/${bookingId}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to update booking. Status: ${response.status}`
        );
      }

      const data = await response.json();

      return data.booking || data;
    } catch (error) {
      return rejectWithValue(
        error.message || "Unable to update booking."
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| SLICE
|--------------------------------------------------------------------------
*/

const bookingsSlice = createSlice({
  name: "bookings",

  initialState,

  reducers: {
    clearSelectedBooking: (state) => {
      state.selectedBooking = null;
      state.detailsError = null;
    },

    clearBookingError: (state) => {
      state.error = null;
      state.detailsError = null;
    },
  },

  extraReducers: (builder) => {
    /*
     * FETCH BOOKINGS
     */

    builder
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
        state.error = null;
      })

      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to load bookings.";
      });

    /*
     * FETCH SINGLE BOOKING
     */

    builder
      .addCase(fetchBookingById.pending, (state) => {
        state.detailsLoading = true;
        state.detailsError = null;
      })

      .addCase(fetchBookingById.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.selectedBooking = action.payload;
        state.detailsError = null;
      })

      .addCase(fetchBookingById.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailsError =
          action.payload || "Failed to load booking.";
      });

    /*
     * UPDATE STATUS
     */

    builder
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        const updatedBooking = action.payload;

        state.bookings = state.bookings.map((booking) =>
          booking.id === updatedBooking.id
            ? updatedBooking
            : booking
        );

        state.selectedBooking = updatedBooking;
      })

      .addCase(updateBookingStatus.rejected, (state, action) => {
        state.error =
          action.payload || "Failed to update booking.";
      });
  },
});

export const {
  clearSelectedBooking,
  clearBookingError,
} = bookingsSlice.actions;

export default bookingsSlice.reducer;