import React from "react";
import CommonHeader from "../components/CommonHeader";

const TermsAndConditions = () => {
  return (
    <>
    <CommonHeader title="Terms & Conditions" />
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8">

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Terms & Conditions
        </h1>

        <p className="text-gray-600 mb-6 text-sm text-center">
          Last updated: April 2026
        </p>

        {/* Section */}
        <div className="space-y-6 text-gray-700 leading-relaxed">

          {/* 1 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using our platform, you agree to comply with and
              be bound by these Terms & Conditions. If you do not agree, please
              do not use our services.
            </p>
          </div>

          {/* 2 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              2. Booking & Payments
            </h2>
            <p>
              All bookings are subject to availability and confirmation.
              Payments must be made in full at the time of booking unless stated
              otherwise.
            </p>
          </div>

          {/* 3 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              3. Cancellation & Refund Policy
            </h2>
            <p>
              Cancellation policies vary depending on the airline or hotel.
              Refunds, if applicable, will be processed as per provider rules and
              may take 7–14 business days.
            </p>
          </div>

          {/* 4 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              4. User Responsibilities
            </h2>
            <p>
              Users are responsible for providing accurate information during
              booking. Any discrepancies may lead to cancellation without refund.
            </p>
          </div>

          {/* 5 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              5. Pricing & Availability
            </h2>
            <p>
              Prices are dynamic and may change without prior notice. We are not
              responsible for pricing errors caused by third-party providers.
            </p>
          </div>

          {/* 6 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              6. Liability Limitation
            </h2>
            <p>
              We act as an intermediary between users and service providers. We
              are not liable for delays, cancellations, or service issues caused
              by airlines or hotels.
            </p>
          </div>

          {/* 7 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              7. Privacy Policy
            </h2>
            <p>
              Your personal data is handled securely and in accordance with our
              privacy policy.
            </p>
          </div>

          {/* 8 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              8. Modifications
            </h2>
            <p>
              We reserve the right to update these terms at any time. Continued
              use of the platform constitutes acceptance of changes.
            </p>
          </div>

          {/* 9 */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              9. Contact Us
            </h2>
            <p>
              For any queries regarding these terms, please contact our support
              team.
            </p>
          </div>
        </div>

        {/* Footer */}
        {/* <div className="mt-10 text-center">
          <button className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-semibold">
            I Agree
          </button>
        </div> */}

      </div>
    </div>
    </>
  );
};

export default TermsAndConditions;