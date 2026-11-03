import React, { useState } from "react";
import { useSelector } from "react-redux";
import Footer from "../components/Footer";
import "react-datepicker/dist/react-datepicker.css";
import CommonFlightHotelSearchBox from "../components/commonflighthotelsearchbox/CommonFlightHotelSearchBox";
import CommonHeader from "../components/CommonHeader";
import PopularSaudiFlightsSection from "../components/flightoffers/PopularSaudiFlightsSection";
import FlightBoardingGuide from "../components/flight/FlightBoardingGuide";
import HeroSlider from "../components/shared/HeroSlider";
import FlightLoader from "../components/loader/FlightLoader";

const FlightSearch = () => {
  const { loading } = useSelector((state) => state.flightSearch || {});
  const [selectedFrom, setSelectedFrom] = useState(null);
  const [selectedTo, setSelectedTo] = useState(null);
  const [selectedClass, setSelectedClass] = useState(false);
  const [selectedFare, setSelectedFare] = useState("Regular Fare");
  const [travellers, setTravellers] = useState({
    adult: 1,
    child: 0,
    infant: 0,
    travelClass: "Economy",
  });

  return (
    <>
      {loading && <FlightLoader />}
      <div className="relative">
        <div className="relative">
          <CommonHeader />
        </div>
        {/* ── Modern Curated Hero Slider ── */}
        <HeroSlider heightClass="h-[460px] sm:h-[500px] md:h-[530px] lg:h-[550px]" />
        <div className="relative z-40 mx-auto -mt-28 sm:-mt-36 md:-mt-44 lg:-mt-48 mb-12 sm:mb-16 lg:mb-20 w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <CommonFlightHotelSearchBox
            selectedFrom={selectedFrom}
            setSelectedFrom={setSelectedFrom}
            selectedTo={selectedTo}
            setSelectedTo={setSelectedTo}
            travellers={travellers}
            setTravellers={setTravellers}
            setSelectedClass={setSelectedClass}
            selectedClass={selectedClass}
            selectedFare={selectedFare}
            setSelectedFare={setSelectedFare}
          />
        </div>
      </div>

      {/* ── Popular Flights to Saudi Section ── */}
      <PopularSaudiFlightsSection />

      {/* ── Step-by-Step Flight Boarding Guide ── */}
      <FlightBoardingGuide />

      <Footer />
    </>
  );
};

export default FlightSearch;
