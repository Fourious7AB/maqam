import { useState } from "react";
import { createLead } from "../services/leadApi";

export default function LeadForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    destination: "",
    from: "",
    to: "",
    budget: "",
    numberOfPeople: 1,
    specialRequests: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        source: "website",
        destination: form.destination,

        travelDates: {
          from: new Date(form.from).toISOString(),
          to: new Date(form.to).toISOString(),
        },

        budget: Number(form.budget),
        numberOfPeople: Number(form.numberOfPeople),
        specialRequests: form.specialRequests,
      };

      await createLead(payload);

      setMessage("Your travel enquiry has been submitted successfully.");

      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        destination: "",
        from: "",
        to: "",
        budget: "",
        numberOfPeople: 1,
        specialRequests: "",
      });
    } catch (error) {
      setMessage(
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="lead-form">
      <h1>Plan Your Journey</h1>

      <input
        name="firstName"
        placeholder="First Name"
        value={form.firstName}
        onChange={handleChange}
        required
      />

      <input
        name="lastName"
        placeholder="Last Name"
        value={form.lastName}
        onChange={handleChange}
        required
      />

      <input
        type="email"
        name="email"
        placeholder="Email Address"
        value={form.email}
        onChange={handleChange}
        required
      />

      <input
        type="tel"
        name="phone"
        placeholder="Phone Number"
        value={form.phone}
        onChange={handleChange}
        required
      />

      <input
        name="destination"
        placeholder="Destination"
        value={form.destination}
        onChange={handleChange}
        required
      />

      <label>Travel From</label>
      <input
        type="date"
        name="from"
        value={form.from}
        onChange={handleChange}
        required
      />

      <label>Travel To</label>
      <input
        type="date"
        name="to"
        value={form.to}
        onChange={handleChange}
        required
      />

      <input
        type="number"
        name="budget"
        placeholder="Budget"
        value={form.budget}
        onChange={handleChange}
        min="0"
        required
      />

      <input
        type="number"
        name="numberOfPeople"
        placeholder="Number of People"
        value={form.numberOfPeople}
        onChange={handleChange}
        min="1"
        required
      />

      <textarea
        name="specialRequests"
        placeholder="Special Requests"
        value={form.specialRequests}
        onChange={handleChange}
      />

      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit Enquiry"}
      </button>

      {message && <p>{message}</p>}
    </form>
  );
}