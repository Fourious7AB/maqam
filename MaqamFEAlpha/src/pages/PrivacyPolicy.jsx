import React from "react";
import CommonHeader from "../components/CommonHeader";

const PrivacyPolicy = () => {
  return (
    <>
      <CommonHeader title="Privacy Policy" />
      <div className="min-h-screen bg-gray-50 py-10 px-6">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8">
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Privacy Policy
          </h1>

          <p className="text-gray-600 text-sm text-center mb-6">
            Last updated: April 2026
          </p>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            {/* 1 */}
            <div>
              <h2 className="text-xl font-semibold mb-2">
                1. Information We Collect
              </h2>
              <p>
                We collect personal information such as your name, email
                address, phone number, and payment details when you use our
                services. This also includes travel preferences and booking
                history.
              </p>
            </div>

            {/* 2 */}
            <div>
              <h2 className="text-xl font-semibold mb-2">
                2. How We Use Your Information
              </h2>
              <p>
                Your data is used to process bookings, provide customer support,
                improve our services, and send important updates related to your
                travel.
              </p>
            </div>

            {/* 3 */}
            <div>
              <h2 className="text-xl font-semibold mb-2">
                3. Sharing of Information
              </h2>
              <p>
                We may share your information with airlines, hotels, and trusted
                partners only for the purpose of completing your booking and
                providing services.
              </p>
            </div>

            {/* 4 */}
            <div>
              <h2 className="text-xl font-semibold mb-2">4. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your
                personal data from unauthorized access, misuse, or disclosure.
              </p>
            </div>

            {/* 5 */}
            <div>
              <h2 className="text-xl font-semibold mb-2">
                5. Cookies & Tracking
              </h2>
              <p>
                We use cookies and similar technologies to enhance user
                experience, analyze traffic, and personalize content.
              </p>
            </div>

            {/* 6 */}
            <div>
              <h2 className="text-xl font-semibold mb-2">6. Your Rights</h2>
              <p>
                You have the right to access, update, or delete your personal
                data. You may also opt out of marketing communications at any
                time.
              </p>
            </div>

            {/* 7 */}
            <div>
              <h2 className="text-xl font-semibold mb-2">
                7. Third-Party Services
              </h2>
              <p>
                Our platform may contain links to third-party websites. We are
                not responsible for their privacy practices.
              </p>
            </div>

            {/* 8 */}
            <div>
              <h2 className="text-xl font-semibold mb-2">
                8. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. Changes
                will be posted on this page with an updated date.
              </p>
            </div>

            {/* 9 */}
            <div>
              <h2 className="text-xl font-semibold mb-2">9. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please
                contact our support team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
