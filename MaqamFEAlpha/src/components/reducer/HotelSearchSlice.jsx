import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../stores/api";

export const fetchHotels = createAsyncThunk(
  "hotelSearch/fetchHotels",
  async (hotelPayload, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/v1/hotels/search", hotelPayload);
      if (response.status !== 200) {
        throw new Error("Failed to fetch hotels");
      }
      return response.data;
    } catch (error) {
      console.error("Hotel API error:", error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const fetchHotelDetails = createAsyncThunk(
  "hotelDetails/fetchHotelDetails",
  async ({ hotelId, searchId }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/v1/hotels/${hotelId}`, {
        params: {
          searchId,
        },
      });

      return response.data;
    } catch (error) {
      console.error(error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

const hotelSearchSlice = createSlice({
  name: "hotelSearch",
  initialState: {
    hotelData: [],
    hotelDetailsData: [],
    loading: false,
    error: null,
  },
  reducers: {
    hydrateHotelData: (state, action) => {
      state.hotelData = action.payload;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHotels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHotels.fulfilled, (state, action) => {
        state.loading = false;
        state.hotelData = action.payload;
      })
      .addCase(fetchHotels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchHotelDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHotelDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.hotelDetailsData = action.payload;
      })
      .addCase(fetchHotelDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { hydrateHotelData } = hotelSearchSlice.actions;
export default hotelSearchSlice.reducer;
