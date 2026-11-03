import { useNavigate } from "react-router-dom";
import { ArrowLeft, CircleX, Search, SlidersHorizontal } from "lucide-react";
import Logo from "../assets/logo.png";
import React, { useState, useEffect, useCallback } from "react";
import { BookOpen } from "lucide-react";
import MakkahImage from "../assets/makkah.jpg";
import MadinahImage from "../assets/hero-slider/slide2-madinah-prophet-mosque.jpg";
import { SearchAPI } from "../configs/api";
import DestinationCard from "../components/DestinationCard";
import LumaSpin from "../components/ui/LumaSpin";

const SearchPage = () => {
  const options = [
    {
      label: "Makkah",
      value: "JED",
      icon: <BookOpen size={18} />,
      image: MakkahImage,
    },
    {
      label: "Madinah",
      value: "MED",
      icon: <Search size={18} />,
      image: MadinahImage,
    },
  ];

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("MED");
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const limit = 9;

  const navigate = useNavigate();

  const fetchSearch = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `${SearchAPI.SearchApi}?iataCode=${selected}&limit=${limit}&page=${page}`,
      );

      const result = await res.json();

      setData(result?.data || []);
    } catch (error) {
      console.error("Search API error:", error);
    } finally {
      setLoading(false);
    }
  }, [selected, limit, page]);

  const fetchSearchAllData = useCallback(async (query) => {
    try {
      setLoading(true);
      const encodedQuery = encodeURIComponent(query.trim());

      const res = await fetch(
        `${SearchAPI.SearchAllDataApi}?title=${encodedQuery}&iataCode=${selected}`,
      );

      const result = await res.json();

      setData(result?.data || []);
    } catch (error) {
      console.error("SearchAllData API error:", error);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    let ignore = false;
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        if (!ignore) fetchSearchAllData(searchQuery);
      }, 300);

      return () => {
        ignore = true;
        clearTimeout(timer);
      };
    }

    const timer = setTimeout(() => {
      if (!ignore) fetchSearch();
    }, 0);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [searchQuery, fetchSearch, fetchSearchAllData]);

  const handleToggleSearch = () => {
    if (searchOpen) {
      setSearchQuery("");
    }
    setSearchOpen((prev) => !prev);
    setOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto font-poppins">
      {/* Top Section */}
      <div className="bg-white p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-3  bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </div>

        <div className="flex gap-2">
          <div className="w-full md:w-96 relative">
            <div
              onClick={() => {
                setOpen(!open);
                setSearchOpen(false);
              }}
              className="bg-teal-600 p-3 rounded-lg cursor-pointer text-white flex items-center gap-2 font-normal"
            >
              <Search size={20} />
              {options.find((option) => option.value === selected)?.label}
            </div>

            {open && (
              <div className="absolute md:w-full w-[200px] mt-2 text-teal-600 bg-white border border-teal-600 font-normal rounded-lg shadow-lg">
                {options.map((item) => (
                  <div
                    key={item.value}
                    onClick={() => {
                      setSelected(item.value);
                      setPage(1);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between p-2 hover:bg-teal-600 hover:text-white hover:rounded-lg cursor-pointer border-b border-teal-600 last:border-none"
                  >
                    <div className="flex gap-1.5 items-center">
                      <Search size={20} />
                      {item.label}
                    </div>

                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.label}
                        className="w-20 h-10 object-cover rounded-lg"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchOpen && (
              <div className="mt-3 absolute w-full top-full left-0">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search hotels, city or country"
                  className="md:w-full bg-white p-3 border border-teal-600 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 w-[300px]"
                />
              </div>
            )}
          </div>
          <button
            onClick={handleToggleSearch}
            className="flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition cursor-pointer font-medium"
          >
            {searchOpen ? (
              <div className="flex items-center gap-2">
                <CircleX size={18} className="text-red-400" />
                Search
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} />
                Search
              </div>
            )}
          </button>
        </div>

        <img
          src={Logo}
          alt="Logo"
          className="w-30 h-12 object-cover rounded-lg"
        />
      </div>

      {/* Loader */}
      {loading && (
        <div className="flex justify-center items-center py-16">
          <LumaSpin
            size="lg"
            variant="brand"
            showProgress={true}
            text="Searching destinations..."
            subtext="Searching hotels, destinations and live availability..."
          />
        </div>
      )}

      {/* Data */}
      {!loading && (
        <>
          {data.length === 0 ? (
            <div className="text-center text-gray-600 mt-16 h-screen flex flex-col items-center gap-4">
              No hotels found. Try a different search term.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {data.map((item, i) => (
                <DestinationCard key={i} item={item} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {!loading && data.length > 0 && (
        <div className="flex justify-center gap-4 mt-10 pb-10">
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
            className={`px-5 py-2 rounded-lg text-white  ${
              page === 1
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-500 cursor-pointer"
            }`}
          >
            Previous
          </button>

          <span className="flex items-center font-semibold text-teal-700">
            Page {page}
          </span>

          <button
            onClick={() => setPage((prev) => prev + 1)}
            className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
