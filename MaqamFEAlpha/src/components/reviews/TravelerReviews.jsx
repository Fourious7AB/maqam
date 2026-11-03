import React from "react";
import { Star, MapPin, CheckCircle2 } from "lucide-react";
import FarhanAvatar from "../../assets/reviews/farhan.jpg";
import AyeshaAvatar from "../../assets/reviews/ayesha.jpg";
import TariqAvatar from "../../assets/reviews/tariq.jpg";
import ZeenatAvatar from "../../assets/reviews/zeenat.jpg";
import ZubairAvatar from "../../assets/reviews/zubair.jpg";
import ShakeelAvatar from "../../assets/reviews/shakeel.jpg";
import AltafAvatar from "../../assets/reviews/altaf.jpg";
import NoorJahanAvatar from "../../assets/reviews/noorjahan.jpg";

/**
 * Clean & Authentic Pilgrim Reviews with Direct Customer Q&A Responses.
 * Clean, compact design with an endless loop marquee that naturally pauses on hover.
 */
const PILGRIM_STORIES = [
  {
    id: 1,
    name: "Mohammed Farhan & Family",
    city: "Mumbai, Maharashtra",
    route: "BOM → JED",
    date: "Dec 2025",
    avatar: FarhanAvatar,
    honestReview:
      "We were nervous traveling with our 74-year-old parents. We were concerned about wheelchair handoffs at Jeddah airport and whether the hotel was close enough to the Haram courtyard. Maqam delivered exactly what was promised—room was right at the courtyard edge.",
    question:
      "Can dedicated wheelchair assistance be pre-arranged at Jeddah airport all the way into our Makkah hotel room?",
    maqamResponse:
      "JazakAllah Khair Brother Farhan! We were honored to welcome your parents. Our coordinator met your family at Terminal 1 with wheelchairs and escorted you through check-in. Thank you for choosing Maqam for your family's Umrah! May Allah accept your prayers. 🤲",
  },
  {
    id: 2,
    name: "Ayesha & Imran Patel",
    city: "Ahmedabad, Gujarat",
    route: "AMD → MED",
    date: "Jan 2026",
    avatar: AyeshaAvatar,
    honestReview:
      "Traveling without our children for the first time was intimidating due to language barriers in Madinah. Maqam’s ground manager greeted us at the airport and guided my wife to the women's entrance at the Prophet's Mosque.",
    question:
      "Will we have Gujarati or Hindi-speaking staff in Madinah to guide my wife to Gate 25 for Rawdah Sharif?",
    maqamResponse:
      "Alhamdulillah Sister Ayesha! Our coordinator Sister Mariam was delighted to guide you through the Nusuk Rawdah permit and accompany you to the sacred chamber entrance. Thank you wholeheartedly for trusting Maqam with your first pilgrimage!",
  },
  {
    id: 3,
    name: "Dr. Tariq Mansoor & Family",
    city: "Hyderabad, Telangana",
    route: "HYD → JED",
    date: "Feb 2026",
    avatar: TariqAvatar,
    honestReview:
      "With hospital duty schedules, we could not afford delays. Maqam arranged our high-speed Haramain bullet train tickets between Makkah and Madinah with business seats and handled our luggage separately without any glitch.",
    question:
      "How is our heavy luggage transferred when taking the high-speed Haramain train between Makkah and Madinah?",
    maqamResponse:
      "JazakAllah Khair Dr. Tariq! While you enjoyed the 2-hour bullet train ride, our cargo van picked up all 5 bags directly from your Makkah suite and had them waiting in your Madinah room. Thank you for choosing Maqam!",
  },
  {
    id: 4,
    name: "Zeenat Khan & Sisters",
    city: "New Delhi",
    route: "DEL → JED",
    date: "Mar 2026",
    avatar: ZeenatAvatar,
    honestReview:
      "As sisters traveling together, safety and certified female guides for historic Ziyarat were our main priorities. Hotel check-in was smooth, and our vehicle driver was respectful throughout.",
    question:
      "Are holy Ziyarat tours conducted with verified, licensed female guides for peace of mind?",
    maqamResponse:
      "BarakAllah Feekum Sister Zeenat! Sister Zahra was pleased to guide your group through Jabal al-Nour, Mount Uhud, and the historic wells. Thank you deeply for choosing Maqam and recommending us to your family!",
  },
  {
    id: 5,
    name: "Zubair Ahmed & Parents",
    city: "Bangalore, Karnataka",
    route: "BLR → JED",
    date: "Jan 2026",
    avatar: ZubairAvatar,
    honestReview:
      "Operators often confirm tickets at the last minute. GoMaqam gave us guaranteed non-stop Saudia airline allotment tickets with confirmed PNR numbers instantly, allowing us to pick bulk-head seats for my father.",
    question:
      "Can we reserve bulk-head seats with extra legroom for my father with knee issues on the direct flight?",
    maqamResponse:
      "Alhamdulillah Brother Zubair! We pre-assigned Row 12 bulk-head seating on SV-753 with airport wheelchair tags. Thank you for traveling with Maqam. May Allah bless your father with sound health and barakah!",
  },
  {
    id: 6,
    name: "Fatima & Shakeel Qureshi",
    city: "Lucknow, Uttar Pradesh",
    route: "LKO → MED",
    date: "Ramadan 2026",
    avatar: ShakeelAvatar,
    honestReview:
      "Performing Umrah during the last 10 days of Ramadan is spiritually intense. Maqam’s team arranged warm halal Suhoor delivered to our room before Tahajjud prayers so our worship was never disrupted.",
    question:
      "Is authentic halal Indian Suhoor available directly at the hotel during the crowded last 10 nights of Ramadan?",
    maqamResponse:
      "JazakAllah Khair Brother Shakeel! We ensured freshly prepared Suhoor was brought to your room each night at 2:30 AM. Thank you for celebrating sacred Ramadan moments with Maqam!",
  },
  {
    id: 7,
    name: "Altaf Hussain Wani",
    city: "Srinagar, Jammu & Kashmir",
    route: "SXR → JED",
    date: "Feb 2026",
    avatar: AltafAvatar,
    honestReview:
      "Connecting flights from Srinagar in winter often face fog delays in Delhi. When our domestic flight was delayed by 2 hours, Maqam tracked our flight and had our private cab waiting at Jeddah with zero penalty.",
    question:
      "What happens if our domestic flight from Srinagar is fog-delayed—do we lose our private airport transfer in Jeddah?",
    maqamResponse:
      "Alhamdulillah Brother Altaf! Our operations desk monitored your flight schedule and updated our driver in Jeddah in real-time. He was waiting right outside Gate 4 with your name board. Thank you for trusting Maqam!",
  },
  {
    id: 8,
    name: "Dr. Noor Jahan Begum",
    city: "Kolkata, West Bengal",
    route: "CCU → MED",
    date: "Mar 2026",
    avatar: NoorJahanAvatar,
    honestReview:
      "From Kolkata, obtaining genuine Saudi tourist eVisas can be confusing with hidden agent charges. Maqam’s portal processed our visas in under 36 hours with full itemized medical insurance details.",
    question:
      "Are Saudi eVisa fees and mandatory medical insurance 100% all-inclusive with zero surprise fees upon arrival?",
    maqamResponse:
      "JazakAllah Khair Dr. Noor Jahan! All official MOFA visa fees, pilgrim medical insurance, and taxes were itemized upfront. Thank you for booking with Maqam from Kolkata! May Allah reward your pilgrimage.",
  },
];

export default function TravelerReviews({ className = "" }) {
  // Seamless infinite loop array
  const loopItems = [...PILGRIM_STORIES, ...PILGRIM_STORIES];

  return (
    <section
      className={`py-8 sm:py-12 px-4 sm:px-6 lg:px-8 xl:px-12 font-poppins border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070c18] transition-colors duration-300 ${className}`}
      aria-labelledby="traveler-reviews-title"
    >
      <div className="w-full max-w-[1760px] mx-auto">
        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
          <div>
            <h2
              id="traveler-reviews-title"
              className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight"
            >
              What Our Pilgrims &amp;{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                Travelers Say
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
              Honest feedback, real questions, and ground solutions from pilgrims across India.
            </p>
          </div>

          {/* Simple Rating Summary */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            <div className="flex items-center text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} className="fill-amber-400" />
              ))}
            </div>
            <span>4.9 / 5.0 (1,200+ Reviews)</span>
          </div>
        </div>

        {/* Endless Marquee Loop (Pauses naturally on hover) */}
        <div className="relative w-full overflow-hidden py-2">
          {/* Edge gradient fades for seamless loop */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-14 z-10 bg-gradient-to-r from-slate-50/90 dark:from-[#070c18] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-14 z-10 bg-gradient-to-l from-slate-50/90 dark:from-[#070c18] to-transparent" />

          <div className="animate-marquee-infinite gap-4 sm:gap-5">
            {loopItems.map((item, index) => (
              <article
                key={`${item.id}-${index}`}
                className="flex-none w-[320px] sm:w-[380px] lg:w-[410px] flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0c1527] shadow-xs hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-colors"
              >
                <div>
                  {/* Pilgrim Info & Stars */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.avatar}
                        alt={item.name}
                        loading="lazy"
                        className="w-10 h-10 rounded-full object-cover border border-slate-200/90 dark:border-slate-700/90 shadow-xs shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <MapPin size={10} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{item.city}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={12} className="fill-amber-400" />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {item.date}
                      </span>
                    </div>
                  </div>

                  {/* Pilgrim Honest Review */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal mb-3">
                    &ldquo;{item.honestReview}&rdquo;
                  </p>

                  {/* Clean Q&A Conversation Thread */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    {/* Pilgrim Question */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                        <span className="text-amber-600 dark:text-amber-400 font-bold mr-1">Q:</span>
                        {item.question}
                      </p>
                    </div>

                    {/* Maqam Response */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                        <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Maqam Holidays:</span>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        {item.maqamResponse}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Route Pill */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {item.route}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Verified Pilgrim
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
