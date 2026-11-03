import { ShieldAlert } from "lucide-react";

const list = [
  "Your flight goes to Ghaziabad near Delhi Airport.",
  "Carry only one cabin baggage and one check-in baggage.",
  "Check-in counters close 60 minutes before departure.",
  "Boarding pass available after web check-in.",
  "Check airline rules for unaccompanied minors."
];

export default function ImportantInformation() {
  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-6">

      <h2 className="text-2xl font-bold mb-6">
        Important Information
      </h2>

      <div className="space-y-5">

        {list.map((item, i) => (
          <div key={i} className="flex gap-4">

            <ShieldAlert className="text-red-500 mt-1" />

            <p className="text-gray-700">
              {item}
            </p>

          </div>
        ))}

      </div>

    </div>
  );
}