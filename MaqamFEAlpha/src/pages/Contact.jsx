import React, { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import CommonHeader from "../components/CommonHeader";
import Namaj from "../assets/namaj.png";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    // 👉 call API here
  };

  return (
    <>
    <CommonHeader title="Contact Us" />
    <div className="min-h-screen bg-gray-50 py-10 px-6">

      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">

        {/* LEFT - CONTACT INFO */}
        <div className="bg-[linear-gradient(130deg,rgba(255,255,255,1)_30%,rgba(27,222,108,1)_100%)] p-8 rounded-2xl shadow-lg relative">

          <h2 className="text-3xl font-bold text-teal-800 mb-6 border-l-4 border-teal-700 pl-2 rounded-s-md">
            Get in Touch
          </h2>

          <p className="text-gray-600 mb-8 font-medium">
            Have questions about bookings, flights, or hotels? 
            Reach out to us and we’ll respond as soon as possible.
          </p>

          <div className="space-y-6">

            <div className="flex items-center gap-4">
              <Mail className="text-teal-600" />
              <span className="text-gray-700 font-medium">support@travel.com</span>
            </div>

            <div className="flex items-center gap-4">
              <Phone className="text-teal-600" />
              <span className="text-gray-700 font-medium">+91 9876543210</span>
            </div>

            <div className="flex items-center gap-4">
              <MapPin className="text-teal-600" />
              <span className="text-gray-700 font-medium">
                Kolkata, India
              </span>
            </div>
            <div className="absolute bottom-0 right-0 md:w-[200px] md:h-[200px]  w-[150px] h-[150px]">
                <img src={Namaj} alt="namaj" className="w-full h-full object-cover rounded-full" />
            </div>

          </div>
        </div>

        {/* RIGHT - FORM */}
        <div className="bg-white p-8 rounded-2xl shadow-lg">

          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Send Message
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border-2 px-4 py-3 border-teal-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            {/* Email */}
            <input
              type="email"
              name="email"
              placeholder="Your Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border-2 px-4 py-3 border-teal-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            {/* Message */}
            <textarea
              name="message"
              rows="5"
              placeholder="Your Message"
              value={formData.message}
              onChange={handleChange}
              className="w-full border-2 px-4 py-3 border-teal-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            ></textarea>

            {/* Button */}
            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-semibold"
            >
              Send Message
            </button>

          </form>
        </div>
      </div>

      {/* MAP SECTION */}
      <div className="max-w-6xl mx-auto mt-10">
        <div className="rounded-2xl overflow-hidden shadow-lg">
          <iframe
            title="map"
            src="https://www.google.com/maps?q=kolkata&output=embed"
            className="w-full h-[300px] border-0"
            loading="lazy"
          ></iframe>
        </div>
      </div>

    </div>
    </>
  );
};

export default Contact;