import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../stores/api";
import { getSortedBillingCountries } from "../../data/worldCountries";

const fallbackCountries = getSortedBillingCountries().map((country) => ({
  name: country.name,
  alpha2Code: country.code,
  capital: "",
  flags: {
    svg: `https://flagcdn.com/w40/${country.code.toLowerCase()}.png`,
  },
}));

export const getNationalism = createAsyncThunk(
  "country/getNationalism",
  async (_, { rejectWithValue }) => {
    try {
      // Use Vite proxy (/restcountries → https://restcountries.com) to avoid CORS
      const response = await fetch("/restcountries/v3.1/all");
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        // Return reliable fallback dataset when external API fails or returns HTML fallback
        return fallbackCountries;
      }

      const countries = await response.json();
      if (!Array.isArray(countries) || countries.length === 0) {
        return fallbackCountries;
      }

      return countries.map((country) => ({
        name: country.name?.common || country.name?.official || "Unknown",
        alpha2Code: country.cca2 || country.cioc || "",
        capital: country.capital?.[0] || "",
        flags: {
          svg: country.flags?.svg || country.flags?.png || "",
        },
      }));
    } catch (error) {
      console.log("Country fetch fallback active:", error.message);
      // Seamlessly fall back to bundled international countries
      return fallbackCountries;
    }
  },
);

export const getCityName = createAsyncThunk(
  "cityname/getCityName",
  async ({ userInput, countryCode = "" }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (userInput) params.set("q", userInput);
      if (countryCode) {
        params.set("countryCode", String(countryCode).toUpperCase());
      }

      const url = `/api/v1/hotels/cities${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const response = await api(url);
      if (response.status !== 200) {
        throw new Error("Failed to fetch hotels");
      }
      return response.data || response;
    } catch (error) {
      console.log("error", error);
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch city data",
      );
    }
  },
);

const regionSlice = createSlice({
  name: "country",
  initialState: {
    countryData: fallbackCountries,
    cityData: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearCityData(state) {
      state.cityData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getNationalism.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getNationalism.fulfilled, (state, action) => {
        state.loading = false;
        state.countryData = action.payload;
      })
      .addCase(getNationalism.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load countries";
      })
      .addCase(getCityName.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCityName.fulfilled, (state, action) => {
        state.loading = false;
        state.cityData = action.payload;
      })
      .addCase(getCityName.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load cities";
      });
  },
});

export const { clearCityData } = regionSlice.actions;
export default regionSlice.reducer;
