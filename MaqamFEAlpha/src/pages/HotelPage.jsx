import React from "react";
import { useSelector } from "react-redux";
import Footer from "../components/Footer";
import CommonHeader from "../components/CommonHeader";
import HotelSearch from "./HotelSearch";
import HotelSuggestions from "../components/HotelSuggestions";
import ExclusiveOffers from "../components/offerssection/ExclusiveOffers";
import HeroSlider from "../components/shared/HeroSlider";
import HotelLoader from "../components/loader/HotelLoader";

const HotelPage = () => {
  const { loading } = useSelector((state) => state.hotelSearch || {});
  const selectOffer = (destination) => {
    document
      .getElementById(`hotel-suggestions-${destination}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {loading && <HotelLoader />}
      <div className="relative">
        <CommonHeader />
        {/* ── Modern Curated Hero Slider ── */}
        <HeroSlider heightClass="h-[460px] sm:h-[500px] md:h-[530px] lg:h-[550px]" />
        <div className="relative z-40 mx-auto -mt-28 sm:-mt-36 md:-mt-44 lg:-mt-48 mb-12 sm:mb-16 lg:mb-20 w-full max-w-7xl px-3 sm:px-6">
          <HotelSearch />
        </div>
      </div>
      <ExclusiveOffers />
      <HotelSuggestions
        title="Hotels in Mecca"
        description="Find available stays close to Masjid al-Haram."
        destination="JED"
      />
      <HotelSuggestions
        title="Hotels in Medina"
        description="Find available stays close to Al-Masjid an-Nabawi."
        destination="MED"
      />
      <Footer />
    </>
  );
};

export default HotelPage;
