import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { FaXTwitter, FaFacebook, FaLinkedinIn } from "react-icons/fa6";
import { AiFillInstagram } from "react-icons/ai";
import {
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Send,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import Logo from "../assets/logo.png";

/**
 * Animated Wave Footer Component
 * Styled with water color #00BAA7 and responsive multi-layer animated waves.
 */
export default function Footer() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSubscribed(true);
    toast.success("Thank you for subscribing to Maqam updates!");
    setEmail("");
  };

  return (
    <footer className="relative w-full overflow-hidden font-poppins selection:bg-white/20 selection:text-white">
      {/* =========================================================
          TOP ANIMATED WAVE TRANSITION CREST (Water Color #00BAA7)
          Seamless repeating wave cycles animated at varied speeds
          ========================================================= */}
      <div
        className="relative w-full h-16 sm:h-24 md:h-32 lg:h-36 overflow-hidden pointer-events-none select-none -mb-1"
        aria-hidden="true"
      >
        {/* Layer 1: Back Deep Wave (Slow) */}
        <div className="absolute inset-x-0 bottom-0 w-[200%] min-w-[2880px] h-full animate-wave-slow">
          <svg
            className="w-full h-full block"
            viewBox="0 0 2880 120"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 0,60 C 360,20 720,85 1080,45 C 1200,35 1320,70 1440,60 C 1800,20 2160,85 2520,45 C 2640,35 2760,70 2880,60 L 2880,120 L 0,120 Z"
              fill="#00BAA7"
              fillOpacity="0.35"
            />
          </svg>
        </div>

        {/* Layer 2: Mid Rolling Swell (Medium & Reverse oscillation) */}
        <div className="absolute inset-x-0 bottom-0 w-[200%] min-w-[2880px] h-full animate-wave-reverse">
          <svg
            className="w-full h-full block"
            viewBox="0 0 2880 120"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 0,50 C 180,20 360,75 540,50 C 720,25 900,70 1080,50 C 1260,30 1350,65 1440,50 C 1620,20 1800,75 1980,50 C 2160,25 2340,70 2520,50 C 2700,30 2790,65 2880,50 L 2880,120 L 0,120 Z"
              fill="#00BAA7"
              fillOpacity="0.55"
            />
          </svg>
        </div>

        {/* Layer 3: Foreground Crest Wave (Fast) */}
        <div className="absolute inset-x-0 bottom-0 w-[200%] min-w-[2880px] h-full animate-wave-fast">
          <svg
            className="w-full h-full block"
            viewBox="0 0 2880 120"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 0,35 C 240,75 480,-5 720,35 C 960,75 1200,-5 1440,35 C 1680,75 1920,-5 2160,35 C 2400,75 2640,-5 2880,35 L 2880,120 L 0,120 Z"
              fill="#00BAA7"
              fillOpacity="0.8"
            />
          </svg>
        </div>

        {/* Layer 4: Solid Water Surface Base */}
        <div className="absolute inset-x-0 bottom-0 w-[200%] min-w-[2880px] h-full animate-wave-medium">
          <svg
            className="w-full h-full block"
            viewBox="0 0 2880 120"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 0,70 C 360,40 720,90 1080,65 C 1260,50 1380,80 1440,70 C 1800,40 2160,90 2520,65 C 2700,50 2820,80 2880,70 L 2880,120 L 0,120 Z"
              fill="#00BAA7"
            />
          </svg>
        </div>
      </div>

      {/* =========================================================
          MAIN FOOTER BODY (Water Color #00BAA7 with Wave Ambience)
          ========================================================= */}
      <div className="relative bg-[#00BAA7] dark:bg-gradient-to-b dark:from-[#004e46] dark:via-[#003832] dark:to-[#021c19] text-white transition-colors duration-300">
        {/* Ambient SVG Waves flowing inside the footer body (Spectrum UI inspired) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {/* Subtle Ambient wave 1 */}
          <div className="absolute -bottom-20 inset-x-0 h-[480px] w-[200%] min-w-[2880px] animate-wave-slow opacity-20">
            <svg
              className="h-full w-full"
              viewBox="0 0 2880 500"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 250C320 150 640 50 960 100C1280 150 1600 350 1920 300C2240 250 2560 150 2880 250V500H0V250Z"
                fill="currentColor"
                className="text-white"
              />
            </svg>
          </div>

          {/* Subtle Ambient wave 2 */}
          <div className="absolute -bottom-10 inset-x-0 h-[420px] w-[200%] min-w-[2880px] animate-wave-reverse opacity-15">
            <svg
              className="h-full w-full"
              viewBox="0 0 2880 500"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 250C320 200 640 100 960 150C1280 200 1600 350 1920 300C2240 250 2560 200 2880 250V500H0V250Z"
                fill="currentColor"
                className="text-emerald-100"
              />
            </svg>
          </div>

          {/* Floating water glow orbs */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-200/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-8 sm:pt-10 pb-12">
          {/* Main Grid: Responsive 5 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-10">
            {/* 1. Brand & Contact (Span 4 cols on lg) */}
            <div className="sm:col-span-2 lg:col-span-4 flex flex-col justify-between">
              <div>
                <NavLink to="/" className="inline-flex items-center gap-3 group">
                  <div className="bg-white/95 dark:bg-slate-900/90 p-2.5 rounded-2xl shadow-lg shadow-black/10 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 border border-white/40">
                    <img
                      src={Logo}
                      alt="Maqam Travel Logo"
                      className="h-10 sm:h-12 w-auto object-contain"
                    />
                  </div>
                </NavLink>

                <p className="mt-4 text-sm sm:text-base text-white/90 leading-relaxed font-normal max-w-sm">
                  Premier travel solutions for Holy Pilgrimages, Umrah, Hajj & Halal
                  holidays worldwide. Dedicated to making sacred journeys serene and memorable.
                </p>

                {/* Direct Contact Info */}
                <div className="mt-5 space-y-2.5 text-xs sm:text-sm text-white/85">
                  <a
                    href="tel:+919609092893"
                    className="flex items-center gap-2.5 hover:text-white transition-colors"
                  >
                    <Phone className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>+91 96090 92893 / +91 96352 32042</span>
                  </a>
                  <a
                    href="mailto:info@qammaqam.com"
                    className="flex items-center gap-2.5 hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>info@qammaqam.com</span>
                  </a>
                  <div className="flex items-center gap-2.5 text-white/80">
                    <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Kolkata, West Bengal, India</span>
                  </div>
                </div>
              </div>

              {/* Social Icons */}
              <div className="mt-6 pt-4 border-t border-white/15">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/75 mb-3">
                  Follow Our Journey
                </p>
                <div className="flex items-center gap-2.5">
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter / X"
                    className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white text-white hover:text-[#00BAA7] flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
                  >
                    <FaXTwitter size={15} />
                  </a>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white text-white hover:text-[#00BAA7] flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
                  >
                    <FaFacebook size={16} />
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white text-white hover:text-[#00BAA7] flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
                  >
                    <AiFillInstagram size={17} />
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white text-white hover:text-[#00BAA7] flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
                  >
                    <FaLinkedinIn size={15} />
                  </a>
                </div>
              </div>
            </div>

            {/* 2. Quick Links / Explore (Span 2 cols on lg) */}
            <div className="lg:col-span-2">
              <h3 className="font-semibold text-base sm:text-lg mb-4 text-white flex items-center gap-2">
                <span>Explore</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              </h3>
              <ul className="space-y-2.5 text-sm text-white/85">
                <li>
                  <NavLink
                    to="/flight"
                    className="inline-flex items-center gap-1.5 hover:text-amber-200 transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-amber-300 transition-colors" />
                    <span>Flights</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/hotel-page"
                    className="inline-flex items-center gap-1.5 hover:text-amber-200 transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-amber-300 transition-colors" />
                    <span>Hotels in Makkah & Madinah</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/package-page"
                    className="inline-flex items-center gap-1.5 hover:text-amber-200 transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-amber-300 transition-colors" />
                    <span>Umrah Packages</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/guides"
                    className="inline-flex items-center gap-1.5 hover:text-amber-200 transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-amber-300 transition-colors" />
                    <span>Ziyarat & Local Guides</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/ai-package-generator"
                    className="inline-flex items-center gap-1.5 hover:text-amber-200 transition-colors group text-amber-200 font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>AI Trip Planner</span>
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* 3. Pilgrim Resources & Support (Span 3 cols on lg) */}
            <div className="lg:col-span-3">
              <h3 className="font-semibold text-base sm:text-lg mb-4 text-white flex items-center gap-2">
                <span>Pilgrim Resources</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              </h3>

              <ul className="space-y-2.5 text-sm text-white/85">
                <li>
                  <NavLink
                    to="/guidelines"
                    className="inline-flex items-center gap-1.5 hover:text-amber-200 transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-amber-300 transition-colors" />
                    <span>Islamic Travel Guidelines</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/booking-help"
                    className="inline-flex items-center gap-1.5 hover:text-amber-200 transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-amber-300 transition-colors" />
                    <span>Pilgrim Help & FAQs</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/privacy-policy"
                    className="inline-flex items-center gap-1.5 hover:text-amber-200 transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-amber-300 transition-colors" />
                    <span>Privacy Policy</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/terms"
                    className="inline-flex items-center gap-1.5 hover:text-amber-200 transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-amber-300 transition-colors" />
                    <span>Terms & Conditions</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/contact"
                    className="inline-flex items-center gap-1.5 hover:text-amber-200 transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-amber-300 transition-colors" />
                    <span>Contact & Support</span>
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* 4. Stay Connected / Newsletter (Span 3 cols on lg) */}
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="h-full rounded-3xl bg-white/10 dark:bg-black/20 p-5 sm:p-6 backdrop-blur-md border border-white/20 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>Stay Connected</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  </h3>
                  <p className="text-xs sm:text-sm text-white/85 mt-2 leading-relaxed">
                    Subscribe for exclusive Umrah deals, hotel promotions, Ramadan packages,
                    and spiritual guides directly to your inbox.
                  </p>

                  {/* Newsletter Form */}
                  <form onSubmit={handleSubscribe} className="mt-4 space-y-2.5">
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address…"
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-white/20 dark:bg-black/30 border border-white/30 text-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:bg-white/25 transition-all backdrop-blur-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold text-sm shadow-md shadow-amber-500/20 transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      <span>Subscribe Now</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {isSubscribed && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-200 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>You are subscribed to sacred journey offers!</span>
                    </div>
                  )}
                </div>

                {/* Quick Policy links */}
                <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
                  <NavLink to="/privacy-policy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </NavLink>
                  <span>•</span>
                  <NavLink to="/terms" className="hover:text-white transition-colors">
                    Terms & Conditions
                  </NavLink>
                  <span>•</span>
                  <NavLink to="/contact" className="hover:text-white transition-colors">
                    Contact Us
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            BOTTOM BAR
            ========================================================= */}
        <div className="relative z-10 border-t border-white/20 dark:border-white/10 bg-black/10 dark:bg-black/30 backdrop-blur-sm py-4 px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="w-full max-w-[1760px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-white/90">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <span>
                © {new Date().getFullYear()}{" "}
                <strong className="font-semibold text-white">Maqam Holidays Pvt. Ltd.</strong> All rights reserved.
              </span>
            </div>

            {/* Developer Credits */}
            <div className="text-center md:text-right text-xs text-white/80">
              Designed & Developed by{" "}
              <a
                href="https://www.vais.co.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white underline hover:text-amber-200 transition-colors"
              >
                VAIS Engineering Private Limited
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
