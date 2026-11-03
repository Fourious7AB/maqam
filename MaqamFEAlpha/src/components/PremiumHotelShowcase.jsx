import { useNavigate } from "react-router-dom";
import { ArrowRight, Crown } from "lucide-react";
import MakkahImage from "../assets/makkah.jpg";
import MadinahImage from "../assets/hero-slider/slide2-madinah-prophet-mosque.jpg";
import HotelImage from "../assets/hotelimages01.jpg";
import HorizontalCarousel from "./shared/HorizontalCarousel";

const luxurySelections = [
  {
    title: "Luxe properties in the holy cities",
    description: "Premium stays near Makkah, Madinah and beyond",
    image: MakkahImage,
  },
  {
    title: "Luxe villas",
    description: "Private villas with exceptional comfort and space",
    image: HotelImage,
  },
  {
    title: "Luxe international stays",
    description: "Istanbul, Morocco and more",
    image: MadinahImage,
  },
];

const flagshipHotels = [
  {
    title: "Makkah Premium Hotels",
    image: MakkahImage,
  },
  {
    title: "Madinah Premium Hotels",
    image: MadinahImage,
  },
  {
    title: "Istanbul Luxury Hotels",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=700",
  },
];

const PremiumHotelShowcase = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-gray-100 dark:bg-[#070c18] px-4 py-8 font-poppins md:px-6 md:py-10 transition-colors">
      <div className="mx-auto max-w-325 space-y-8">
        <div className="flex flex-col overflow-hidden rounded-lg bg-[#fffdf8] dark:bg-[#0f172a] border border-transparent dark:border-slate-800 shadow-sm md:flex-row md:items-center">
          <div className="shrink-0 px-5 py-6 sm:px-6 sm:py-8 md:w-[32%] md:px-10">
            <div className="mb-4 inline-flex animate-pulse items-center gap-2 rounded-full border border-[#e5c56f]/60 bg-[#fff7dc] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#a47b18]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d8a82e] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c6921b]" />
              </span>
              Upcoming
            </div>
            <p className="mb-2 text-xs font-bold uppercase text-gray-700 dark:text-slate-300">
              Introducing
            </p>
            <h2 className="max-w-55 text-2xl sm:text-3xl font-extrabold leading-tight text-[#e5c56f] md:text-[36px]">
              Luxury Selections of
              <br />
              Maqam
            </h2>
          </div>
          <HorizontalCarousel inset ariaLabel="luxury selections" className="min-w-0 md:flex-1" trackClassName="gap-5 px-4 pb-5 md:px-0 md:py-8 md:pr-7">
            {luxurySelections.map((selection) => (
              <button
                type="button"
                key={selection.title}
                onClick={() => navigate("/hotel-page")}
                className="group shrink-0 snap-start w-[78%] min-w-[235px] max-w-[280px] sm:w-[250px] overflow-hidden rounded-md bg-white text-left shadow-md transition hover:-translate-y-1 hover:shadow-lg"
              >
                <img
                  src={selection.image}
                  alt={selection.title}
                  className="h-40 w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="p-4">
                  <h3 className="text-lg font-extrabold leading-tight text-gray-950">
                    {selection.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {selection.description}
                  </p>
                </div>
              </button>
            ))}
          </HorizontalCarousel>
        </div>

        <div className="flex flex-col overflow-hidden rounded-lg bg-[#eff8ff] shadow-sm md:flex-row md:items-center">
          <div className="flex shrink-0 flex-wrap items-center gap-3 px-5 py-6 sm:px-6 sm:py-7 md:w-[28%] md:px-10">
            <div className="mb-2 sm:mb-4 inline-flex animate-pulse items-center gap-2 rounded-full border border-[#e5c56f]/60 bg-[#fff7dc] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#a47b18]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d8a82e] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c6921b]" />
              </span>
              Upcoming
            </div>
            <Crown className="hidden text-sky-700 sm:block" size={28} />
            <h2 className="max-w-55 text-2xl sm:text-3xl font-extrabold leading-tight text-gray-950">
              Premium Hotspot
              <br />
            </h2>
          </div>
          <HorizontalCarousel inset ariaLabel="premium hotspots" className="min-w-0 md:flex-1" trackClassName="gap-3 px-4 pb-5 md:px-0 md:py-10 md:pr-10">
            {flagshipHotels.map((hotel) => (
              <button
                type="button"
                key={hotel.title}
                onClick={() => navigate("/hotel-page")}
                className="group relative h-32 shrink-0 snap-start w-[72%] min-w-[200px] max-w-[250px] sm:w-[220px] overflow-hidden rounded-xl text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <img
                  src={hotel.image}
                  alt={hotel.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 text-sm font-extrabold leading-tight text-white">
                  {hotel.title}
                </span>
              </button>
            ))}
          </HorizontalCarousel>
        </div>

        <button
          type="button"
          onClick={() => navigate("/hotel-page")}
          className="mx-auto flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900"
        >
          Explore premium stays <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
};

export default PremiumHotelShowcase;
