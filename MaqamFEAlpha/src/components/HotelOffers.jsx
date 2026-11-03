import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, MapPin, Percent } from "lucide-react";
import MakkahImage from "../assets/makkah.jpg";
import MadinahImage from "../assets/hero-slider/slide2-madinah-prophet-mosque.jpg";
import HorizontalCarousel from "./shared/HorizontalCarousel";

const offers = [
  {
    title: "Makkah hotel stays",
    places: "Near Masjid al-Haram",
    discount: "30% OFF",
    target: "JED",
    image: MakkahImage,
    accent: "from-emerald-600 to-teal-700",
  },
  {
    title: "Madinah hotel stays",
    places: "Near Al-Masjid an-Nabawi",
    discount: "30% OFF",
    target: "MED",
    image: MadinahImage,
    accent: "from-sky-600 to-cyan-700",
  },
  {
    title: "Istanbul hotel stays",
    places: "Mosques, history and culture",
    discount: "30% OFF",
    target: "IST",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=900",
    accent: "from-indigo-600 to-blue-700",
  },
];

const HotelOffers = ({ onSelectOffer }) => {
  const navigate = useNavigate();

  const handleOfferClick = (target) => {
    if (onSelectOffer) {
      onSelectOffer(target);
      return;
    }
    navigate("/hotel-page");
  };

  return (
    <section className="border-b border-emerald-100 dark:border-slate-800 bg-white dark:bg-[#070c18] py-8 md:py-10 font-poppins transition-colors">
      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6">
        <div className="mb-5 flex items-end justify-between gap-4 px-6 sm:px-9 md:px-11 lg:px-12">
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
              <Percent size={14} />
              Limited-time hotel offers
            </p>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white md:text-3xl">
              Stay closer to the holy cities
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate("/hotel-page")}
            className="hidden items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900 sm:flex"
          >
            View all hotels <ArrowRight size={16} />
          </button>
        </div>

        <HorizontalCarousel
          ariaLabel="hotel offers"
          arrowOffset="padding"
          trackClassName="gap-4 pb-2"
        >
          {offers.map((offer) => (
            <article
              key={offer.title}
              onClick={() => handleOfferClick(offer.target)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleOfferClick(offer.target);
                }
              }}
              role="button"
              tabIndex={0}
              className="group relative min-h-47.5 w-[84%] min-w-[260px] sm:min-w-[300px] md:min-w-[280px] flex-1 shrink-0 snap-start overflow-hidden rounded-2xl shadow-md"
            >
              <img
                src={offer.image}
                alt={offer.title}
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div
                className={`absolute inset-0 bg-linear-to-r ${offer.accent} opacity-85`}
              />
              <div className="relative flex min-h-47.5 flex-col justify-between p-5 text-white">
                <div>
                  <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide backdrop-blur-sm">
                    <Building2 size={13} />
                    {offer.discount}
                  </div>
                  <h3 className="max-w-55 text-xl font-extrabold leading-tight">
                    {offer.title}
                  </h3>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-white/90">
                    <MapPin size={14} />
                    {offer.places}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOfferClick(offer.target);
                  }}
                  className="flex w-fit items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-white transition hover:gap-3"
                >
                  Explore stays <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
</HorizontalCarousel>
      </div>
    </section>
  );
};

export default HotelOffers;
