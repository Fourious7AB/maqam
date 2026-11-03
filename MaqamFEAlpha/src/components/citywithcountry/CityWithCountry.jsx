import { useDispatch } from "react-redux";
import { clearCityData } from "../reducer/NationalismSlice";
import {
  ChevronDown,
  Contact,
  ArrowLeft,
  ArrowRight,
  Hotel,
} from "lucide-react";

const CityWithCountry = ({
  setCityname,
  cityData,
  setCityId,
  setCountryCode,
  onCitySelect,
}) => {
  const dispatch = useDispatch();

  const handleSelectTo = (city) => {
    if (!city?.cityId || !city?.cityName) return;

    setCityname(city.cityName);
    setCityId(city.cityId);
    setCountryCode(city.countryCode || "");
    if (onCitySelect) {
      onCitySelect(city);
    }
    dispatch(clearCityData());
    localStorage.setItem("cityname", JSON.stringify(city));
  };

  return (
    <>
      <div
        className="absolute left-5 top-3/4 mt-2 w-full max-w-[440px] h-[360px] bg-white rounded-xl border border-gray-200 shadow-[0_12px_40px_rgba(0,0,0,0.18)] overflow-y-auto
       overflow-x-hidden
       overscroll-contain
       scrollbar-thin
       scrollbar-thumb-gray-400
       scrollbar-track-gray-100
       z-[9999]"
      >
        {Array.isArray(cityData?.data) &&
          cityData.data.map((city) => {
            const hasFlag = city.countryCode !== "XX";

            return (
              <button
                key={city.cityId}
                onClick={() => handleSelectTo(city)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors last:border-b-0"
              >
                {/* Left */}
                <div className="flex items-center gap-3">
                  {hasFlag ? (
                    <img
                      src={`https://flagcdn.com/w40/${city.countryCode.toLowerCase()}.png`}
                      alt={city.country}
                      className="w-5 h-4 border object-cover rounded-sm"
                    />
                  ) : (
                    <div className="w-5 h-4 border rounded-sm bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500">
                      🌍
                    </div>
                  )}

                  <div className="text-left">
                    <h3 className="text-[17px] font-semibold uppercase tracking-wide text-[#F57C00] leading-none">
                      {city.cityName}
                    </h3>

                    <p className="mt-1 text-[13px] font-medium text-gray-700 uppercase">
                      ({city.country})
                    </p>
                  </div>
                </div>

                {/* Right */}
                <div className="min-w-[38px] rounded-md bg-green-600 px-2 py-1 text-center">
                  <span className="text-xs font-bold text-white">
                    {city.countryCode}
                  </span>
                </div>
              </button>
            );
          })}
      </div>
    </>
  );
};

export default CityWithCountry;
