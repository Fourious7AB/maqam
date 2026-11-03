import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import anime from "animejs";
import { staggerEntrance, clickSquash } from "../animations/presets";
import AnimatedNumber from "./shared/AnimatedNumber";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cookie,
  Coffee,
  Leaf,
  Minus,
  Moon,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  SunMedium,
  UtensilsCrossed,
  Wrench,
  Clock,
  ChefHat,
  Truck,
  HeartHandshake,
  Soup,
} from "lucide-react";
import CommonHeader from "./CommonHeader";
import Footer from "./Footer";
import { useData } from "../store/dataContext";
import { afterDiscount } from "../utils/format";

import slide1 from "../assets/hero-slider/slide1-makkah-kaaba-tawaf.jpg";
import slide2 from "../assets/hero-slider/slide2-madinah-prophet-mosque.jpg";
import slide3 from "../assets/hero-slider/slide3-madinah-green-dome.jpg";

const heroSlides = [
  { src: slide1, alt: "Maqam hero background 1" },
  { src: slide2, alt: "Maqam hero background 2" },
  { src: slide3, alt: "Maqam hero background 3" },
  { src: slide2, alt: "Maqam hero background 4" },
  { src: slide1, alt: "Maqam hero background 5" },
];

const meals = [
  {
    id: "breakfast",
    label: "Breakfast",
    caption: "Start with barakah",
    icon: Coffee,
  },
  {
    id: "lunch",
    label: "Lunch",
    caption: "A wholesome midday plate",
    icon: SunMedium,
  },
  {
    id: "snacks",
    label: "Evening Snacks",
    caption: "Light bites for the journey",
    icon: Cookie,
  },
  { id: "dinner", label: "Dinner", caption: "End your day gently", icon: Moon },
];

const menuItems = [
  {
    id: "shakshuka",
    meal: "breakfast",
    name: "Madinah Shakshuka",
    description:
      "Poached eggs in spiced tomato sauce with warm khubz and olives.",
    price: 340,
    time: "15 min",
    tag: "Popular",
    image:
      "https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "ful",
    meal: "breakfast",
    name: "Ful Medames Bowl",
    description:
      "Slow-cooked fava beans, tahini, herbs, eggs and fresh Arabic bread.",
    price: 290,
    time: "10 min",
    tag: "High protein",
    image:
      "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "balaleet",
    meal: "breakfast",
    name: "Balaleet with Omelette",
    description:
      "Sweet saffron vermicelli paired with a delicate cardamom omelette.",
    price: 320,
    time: "12 min",
    tag: "Gulf classic",
    image:
      "https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "labneh",
    meal: "breakfast",
    name: "Labneh Breakfast Board",
    description:
      "Creamy labneh, za'atar, cucumber, tomatoes and warm pita bread.",
    price: 280,
    time: "8 min",
    tag: "Vegetarian",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "menemen",
    meal: "breakfast",
    name: "Turkish Menemen",
    description:
      "Soft scrambled eggs with tomatoes, peppers, herbs and toasted bread.",
    price: 310,
    time: "14 min",
    tag: "Fresh daily",
    image:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "honey-toast",
    meal: "breakfast",
    name: "Honey Tahini Toast",
    description:
      "Wholegrain toast with tahini, local honey, banana and toasted sesame.",
    price: 260,
    time: "7 min",
    tag: "Light",
    image:
      "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "chickpea-frittata",
    meal: "breakfast",
    name: "Chickpea Herb Frittata",
    description:
      "A golden chickpea and egg frittata with mint salad and olives.",
    price: 300,
    time: "16 min",
    tag: "Vegetarian",
    image:
      "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "date-pancakes",
    meal: "breakfast",
    name: "Date & Cardamom Pancakes",
    description:
      "Fluffy pancakes with date syrup, yogurt and crushed pistachios.",
    price: 350,
    time: "15 min",
    tag: "Family favorite",
    image:
      "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "sujuk-eggs",
    meal: "breakfast",
    name: "Sujuk & Eggs Skillet",
    description:
      "Halal beef sujuk, eggs, peppers and tomatoes served in a hot skillet.",
    price: 380,
    time: "17 min",
    tag: "Hearty",
    image:
      "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "ful-shakshuka",
    meal: "breakfast",
    name: "Ful & Shakshuka Duo",
    description:
      "Two breakfast favorites with warm khubz for a generous morning plate.",
    price: 410,
    time: "18 min",
    tag: "Best value",
    image:
      "https://images.unsplash.com/photo-1513442542250-854d436a73f2?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "mandi",
    meal: "lunch",
    name: "Haram Mandi Platter",
    description:
      "Fragrant slow-roasted chicken over Yemeni spiced rice with salata.",
    price: 620,
    time: "25 min",
    tag: "Chef's pick",
    image:
      "https://images.unsplash.com/photo-1517244683847-7456b63c5969?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "falafel",
    meal: "lunch",
    name: "Jeddah Falafel Plate",
    description:
      "Crisp chickpea falafel, hummus, fattoush and pickled vegetables.",
    price: 390,
    time: "12 min",
    tag: "Vegetarian",
    image:
      "https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "kabsa-lunch",
    meal: "lunch",
    name: "Madinah Chicken Kabsa",
    description:
      "Tender chicken, spiced rice, raisins and roasted almonds with salata.",
    price: 590,
    time: "25 min",
    tag: "Popular",
    image:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "beef-mandi",
    meal: "lunch",
    name: "Slow-Cooked Beef Mandi",
    description:
      "Fall-apart halal beef with smoky rice, green chutney and yogurt dip.",
    price: 720,
    time: "30 min",
    tag: "Chef's pick",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "shawarma",
    meal: "lunch",
    name: "Makkah Chicken Shawarma",
    description:
      "Marinated chicken, garlic sauce, pickles and fries wrapped in saj bread.",
    price: 420,
    time: "12 min",
    tag: "Street favorite",
    image:
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "maqluba",
    meal: "lunch",
    name: "Palestinian Maqluba",
    description:
      "Upside-down rice with aubergine, cauliflower, chicken and cucumber yogurt.",
    price: 560,
    time: "24 min",
    tag: "Traditional",
    image:
      "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "biryani",
    meal: "lunch",
    name: "Royal Chicken Biryani",
    description:
      "Layered basmati rice, halal chicken, saffron, mint and cooling raita.",
    price: 530,
    time: "22 min",
    tag: "Aromatic",
    image:
      "https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "lentil-bowl",
    meal: "lunch",
    name: "Lentil & Grain Bowl",
    description:
      "Warm lentils, quinoa, roasted vegetables, herbs and tahini dressing.",
    price: 380,
    time: "14 min",
    tag: "Vegan",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "grilled-fish",
    meal: "lunch",
    name: "Red Sea Grilled Fish",
    description:
      "Seasoned grilled fish with lemon rice, greens and coriander salsa.",
    price: 680,
    time: "20 min",
    tag: "Light & fresh",
    image:
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "musakhan",
    meal: "lunch",
    name: "Sumac Chicken Musakhan",
    description:
      "Roasted chicken with sumac onions, pine nuts and taboon bread.",
    price: 610,
    time: "26 min",
    tag: "Palestinian classic",
    image:
      "https://images.unsplash.com/photo-1604908177522-040f7c6f1b4c?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "dates",
    meal: "snacks",
    name: "Ajwa Date & Nut Box",
    description:
      "A nourishing mix of Madinah Ajwa dates, almonds and dried fruit.",
    price: 240,
    time: "5 min",
    tag: "Travel friendly",
    image:
      "https://images.unsplash.com/photo-1599909533730-f9d6e9a3e0e3?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "sambosa",
    meal: "snacks",
    name: "Crescent Sambosa",
    description:
      "Golden pastry filled with vegetables and aromatic herbs, served with dip.",
    price: 210,
    time: "8 min",
    tag: "Vegetarian",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "hummus-cups",
    meal: "snacks",
    name: "Hummus & Pita Cups",
    description:
      "Silky hummus, crisp pita chips, cucumber and za'atar in a snack box.",
    price: 220,
    time: "6 min",
    tag: "Vegetarian",
    image:
      "https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "cheese-rolls",
    meal: "snacks",
    name: "Cheese Sambousek",
    description:
      "Crisp pastry parcels filled with white cheese, mint and black seed.",
    price: 230,
    time: "8 min",
    tag: "Crowd pleaser",
    image:
      "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "falafel-wrap",
    meal: "snacks",
    name: "Mini Falafel Wraps",
    description:
      "Three bite-sized falafel wraps with tahini, herbs and pickled turnip.",
    price: 260,
    time: "9 min",
    tag: "Vegetarian",
    image:
      "https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "arabic-coffee",
    meal: "snacks",
    name: "Arabic Coffee & Dates",
    description:
      "A small dallah of cardamom coffee with premium Ajwa and Medjool dates.",
    price: 190,
    time: "5 min",
    tag: "Madinah favorite",
    image:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "fruit-cup",
    meal: "snacks",
    name: "Seasonal Fruit Cup",
    description:
      "Hydrating seasonal fruit with mint and a squeeze of fresh lime.",
    price: 180,
    time: "4 min",
    tag: "Refreshing",
    image:
      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "baklava",
    meal: "snacks",
    name: "Pistachio Baklava Trio",
    description:
      "Three delicate layers of filo, pistachio and orange blossom syrup.",
    price: 250,
    time: "5 min",
    tag: "Sweet treat",
    image:
      "https://images.unsplash.com/photo-1519671282429-b44660ead0a7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "manakish",
    meal: "snacks",
    name: "Za'atar Manakish",
    description:
      "Freshly baked flatbread topped with za'atar, olive oil and sesame.",
    price: 210,
    time: "10 min",
    tag: "Baked fresh",
    image:
      "https://images.unsplash.com/photo-1573140401552-3fab0b24306f?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "lentil-soup",
    meal: "snacks",
    name: "Red Lentil Soup Cup",
    description:
      "Warm, silky lentil soup with lemon, cumin and toasted Arabic bread.",
    price: 200,
    time: "9 min",
    tag: "Comforting",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "kabsa",
    meal: "dinner",
    name: "Royal Chicken Kabsa",
    description:
      "Tender chicken, fragrant basmati, roasted nuts and a bright tomato salata.",
    price: 580,
    time: "25 min",
    tag: "Popular",
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "harira",
    meal: "dinner",
    name: "Moroccan Harira Supper",
    description:
      "A comforting lentil and tomato soup with herbs, dates and fresh bread.",
    price: 360,
    time: "18 min",
    tag: "Light & nourishing",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "lamb-ouzi",
    meal: "dinner",
    name: "Lamb Ouzi Rice",
    description:
      "Slow-roasted halal lamb over spiced rice with peas, raisins and nuts.",
    price: 760,
    time: "30 min",
    tag: "Celebration dish",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "chicken-tagine",
    meal: "dinner",
    name: "Moroccan Chicken Tagine",
    description:
      "Tender chicken with preserved lemon, olives, saffron and warm bread.",
    price: 570,
    time: "24 min",
    tag: "Slow cooked",
    image:
      "https://images.unsplash.com/photo-1539755530862-00f623c00f52?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "kofta-platter",
    meal: "dinner",
    name: "Grilled Kofta Platter",
    description:
      "Charcoal-grilled beef kofta with hummus, rice, salad and garlic sauce.",
    price: 630,
    time: "22 min",
    tag: "Grill house",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "stuffed-peppers",
    meal: "dinner",
    name: "Stuffed Pepper Mahshi",
    description:
      "Peppers filled with fragrant rice, herbs and vegetables in tomato sauce.",
    price: 430,
    time: "20 min",
    tag: "Vegetarian",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "seafood-rice",
    meal: "dinner",
    name: "Gulf Seafood Rice",
    description:
      "Shrimp and fish with spiced rice, coriander, lemon and cucumber salad.",
    price: 740,
    time: "27 min",
    tag: "From the coast",
    image:
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "vegetable-couscous",
    meal: "dinner",
    name: "Seven-Vegetable Couscous",
    description:
      "Fluffy couscous with seasonal vegetables, chickpeas and harissa on the side.",
    price: 450,
    time: "18 min",
    tag: "Vegan",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "musabaha",
    meal: "dinner",
    name: "Warm Musabaha Plate",
    description:
      "Whole chickpeas, tahini, pine nuts, herbs and fresh flatbread for sharing.",
    price: 390,
    time: "12 min",
    tag: "Vegan",
    image:
      "https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "rice-pudding",
    meal: "dinner",
    name: "Rosewater Rice Pudding",
    description:
      "Silky rice pudding with rosewater, cinnamon and crushed pistachios.",
    price: 220,
    time: "6 min",
    tag: "Dessert",
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=85",
  },
];

const Food = () => {
  const { meals: inventoryMeals } = useData();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeMeal, setActiveMeal] = useState("breakfast");
  const [currentPage, setCurrentPage] = useState(1);
  const [basket, setBasket] = useState({});
  const chefIconRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    staggerEntrance(".food-banner-card", { stagger: 70, startDelay: 100 });
    if (chefIconRef.current) {
      anime({
        targets: chefIconRef.current,
        translateY: [-4, 4],
        duration: 1500,
        direction: "alternate",
        loop: true,
        easing: "easeInOutSine",
      });
    }
  }, []);

  useEffect(() => {
    staggerEntrance(".food-menu-item-card", {
      stagger: 50,
      startDelay: 60,
    });
  }, [activeMeal, currentPage]);

  const allMenuItems = useMemo(() => {
    const fromInventory = (inventoryMeals || []).map((m) => ({
      id: m.id,
      meal: m.type === "Veg" ? "lunch" : "dinner",
      name: m.name,
      description: m.description || "Authentic culinary preparation with fresh ingredients.",
      price: afterDiscount(m.sellPrice, m.discount),
      time: "20 min",
      tag: m.type,
      image: m.image || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800",
    }));
    return [...menuItems, ...fromInventory];
  }, [inventoryMeals]);

  const visibleItems = allMenuItems.filter((item) => item.meal === activeMeal);
  const itemsPerPage = 4;
  const totalPages = Math.ceil(visibleItems.length / itemsPerPage);
  const paginatedItems = visibleItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const basketItems = useMemo(
    () => allMenuItems.filter((item) => basket[item.id]),
    [allMenuItems, basket],
  );
  const totalItems = Object.values(basket).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const total = basketItems.reduce(
    (sum, item) => sum + item.price * basket[item.id],
    0,
  );

  return (
    <div className="w-full bg-white dark:bg-[#070c18] font-poppins transition-colors">
      <CommonHeader />

      {/* ── BG slides (fullscreen with curved bottom) matching Cab Booking Page ── */}
      <div
        className="relative w-full h-[460px] sm:h-[500px] overflow-hidden"
        style={{
          borderBottomLeftRadius: "50% 18%",
          borderBottomRightRadius: "50% 18%",
        }}
      >
        {/* Hero Slides */}
        <div
          className="flex h-full transition-transform duration-1000 ease-in-out"
          style={{
            transform: `translateX(-${currentSlide * 100}%)`,
          }}
        >
          {heroSlides.map((slide, i) => (
            <img
              key={i}
              src={slide.src}
              alt={slide.alt}
              className="w-full h-full object-cover shrink-0"
            />
          ))}
        </div>

        {/* Hero Dark Overlay with Title */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65 flex flex-col items-center justify-center text-center px-4 pt-12">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/90 text-white font-bold text-xs uppercase tracking-wider mb-3 shadow-md backdrop-blur-xs">
            <Wrench className="w-3.5 h-3.5" />
            Under Development
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
            Halal Food & Catering Services
          </h1>
          <p className="text-xs sm:text-sm text-gray-200 mt-2 max-w-xl drop-shadow-xs">
            We are engineering a fast, fresh, and wholesome halal dining & room delivery experience for your pilgrimage in Makkah and Madinah.
          </p>
        </div>
      </div>

      <div className="relative z-40 -mt-24 mb-16 w-[95%] max-w-6xl mx-auto px-2 sm:px-4">
        <div className="w-full bg-white dark:bg-[#0f172a] rounded-3xl p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-slate-800 relative overflow-hidden">
          
          {/* Under Development Overlay / Banner Card (Same as Cab Page) */}
          <div className="food-banner-card relative z-30 mb-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-teal-50/80 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 border border-amber-200/80 dark:border-slate-700 text-center shadow-xs">
            <div ref={chefIconRef} className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/20">
              <ChefHat className="w-7 h-7" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 font-extrabold text-xs tracking-wider uppercase mb-2">
              <Clock className="w-3.5 h-3.5" />
              Feature In Progress
            </span>

            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
              Halal Food & Meal Ordering Service is Coming Soon!
            </h2>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed mb-5">
              Online meal ordering is currently under active development. You will soon be able to order fresh halal dishes, daily Suhoor & Iftar packs, and group catering delivered directly to your hotel room in Makkah & Madinah.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/flight"
                onClick={(e) => clickSquash(e.currentTarget)}
                className="px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer"
              >
                Explore Flights
              </Link>
              <Link
                to="/hotel-page"
                onClick={(e) => clickSquash(e.currentTarget)}
                className="px-6 py-2.5 rounded-full bg-white hover:bg-gray-50 text-teal-800 border border-teal-300 font-bold text-xs uppercase tracking-wider shadow-xs transition active:scale-95 cursor-pointer"
              >
                Explore Hotels
              </Link>
              <Link
                to="/visa-card"
                onClick={(e) => clickSquash(e.currentTarget)}
                className="px-6 py-2.5 rounded-full bg-white hover:bg-gray-50 text-amber-800 border border-amber-300 font-bold text-xs uppercase tracking-wider shadow-xs transition active:scale-95 cursor-pointer"
              >
                Apply Visa
              </Link>
            </div>
          </div>

          {/* Original Form / Menu Layout (Kept for preview & when feature launches - Same as Cab Page) */}
          <div className="opacity-60 pointer-events-none select-none filter blur-[0.3px] relative pb-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
              <div>
                <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(25,59,54,0.08)] sm:grid-cols-4">
                  {meals.map(({ id, label, caption, icon: Icon }) => {
                    const active = id === activeMeal;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={(e) => {
                          clickSquash(e.currentTarget);
                          setActiveMeal(id);
                          setCurrentPage(1);
                        }}
                        className={`flex flex-col items-center rounded-xl px-3 py-3 text-center transition ${
                          active
                            ? "bg-[#163b36] text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon
                          size={20}
                          className={active ? "text-[#f5ca72]" : "text-slate-400"}
                        />
                        <span className="mt-1 text-xs font-bold">{label}</span>
                        <span
                          className={`mt-0.5 text-[10px] ${
                            active ? "text-emerald-100/70" : "text-slate-400"
                          }`}
                        >
                          {caption}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {paginatedItems.map((item) => (
                    <div
                      key={item.id}
                      className="food-menu-item-card group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition hover:shadow-md"
                    >
                      <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl bg-slate-100 mb-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          {item.tag}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-800">
                            {item.name}
                          </h3>
                          <span className="text-sm font-extrabold text-[#163b36]">
                            <AnimatedNumber value={item.price} prefix="₹" />
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock3 size={13} /> {item.time}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="text-xs font-bold text-slate-700">
                            {basket[item.id] || 0}
                          </span>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#163b36] text-white hover:bg-[#1f4e48]"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-200/80 pt-4">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#163b36] transition hover:bg-[#f7f2e7] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#163b36] transition hover:bg-[#f7f2e7] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(25,59,54,0.08)]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={18} className="text-[#c58223]" />
                    <h2 className="font-mirza text-2xl text-[#163b36]">
                      Your selection
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#f7f2e7] px-2 py-1 text-[11px] font-bold text-[#c58223]">
                    {totalItems} items
                  </span>
                </div>
                {basketItems.length === 0 ? (
                  <div className="py-10 text-center">
                    <UtensilsCrossed
                      size={28}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      Your tray is waiting
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Add dishes from the menu to build your meal plan.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {basketItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {item.name}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            ₹{item.price} x {basket[item.id]}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-[#163b36]">
                          ₹{item.price * basket[item.id]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-500">
                      Estimated total
                    </span>
                    <span className="text-xl font-bold text-[#163b36]">
                      ₹{total}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-300 text-sm font-bold text-gray-600 cursor-not-allowed"
                  >
                    Continue to details <ChevronRight size={17} />
                  </button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                    <ShieldCheck size={13} className="text-emerald-500" />{" "}
                    Prepared in a halal-certified kitchen
                  </p>
                </div>
              </aside>
            </div>
          </div>

          {/* Coming Soon Button centered floating at the bottom (Same as Cab Page) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
            <button
              type="button"
              disabled
              className="bg-gray-400 text-white font-bold text-xs sm:text-sm uppercase tracking-wider px-8 sm:px-10 py-3 sm:py-3.5 rounded-full shadow-md cursor-not-allowed whitespace-nowrap opacity-90"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Food & Catering Services Feature Showcase (Same as Cab Page) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-4">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={13} className="text-teal-600" />
            What to Expect
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Upcoming Food & Dining Services
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Wholesome Islamic dining solutions crafted for pilgrims and families.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3.5">
              <Truck className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900 mb-1">
              Hotel Room Delivery
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Hot, freshly cooked halal meals delivered directly to your hotel reception or room.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900 mb-1">
              100% Halal Certified
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Prepared exclusively in verified halal-certified kitchens adhering to Islamic dietary standards.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3.5">
              <Soup className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900 mb-1">
              Daily Pilgrim Meal Plans
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Pre-bookable breakfast, lunch, and dinner packages aligned with prayer times.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center mb-3.5">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900 mb-1">
              Family & Group Catering
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Specialized bulk catering and custom diet options (diabetic, vegetarian) for groups.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Food;
