import { useState } from "react";

const emptyRoom = {
  name: "",
  capacity: 2,
  price: "",
  currency: "SAR",
};

export default function HotelForm({
  initialData,
  onSubmit,
  submitText = "Save Hotel",
}) {
  const [form, setForm] = useState({
    userName: initialData?.userName || "",
    hotelName: initialData?.hotelName || "",
    city: initialData?.city || "",
    country:
      initialData?.country || "Saudi Arabia",

    address: initialData?.address || "",

    phone: initialData?.phone || "",

    email: initialData?.email || "",

    starRating:
      initialData?.starRating || 3,

    checkIn:
      initialData?.checkIn || "03:00 PM",

    checkOut:
      initialData?.checkOut || "12:00 PM",

    description:
      initialData?.description || "",

    status:
      initialData?.status || "Active",

    rooms:
      initialData?.rooms?.length
        ? initialData.rooms
        : [emptyRoom],
  });

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updateRoom = (index, name, value) => {
    setForm((current) => ({
      ...current,

      rooms: current.rooms.map(
        (room, roomIndex) =>
          roomIndex === index
            ? {
                ...room,
                [name]: value,
              }
            : room
      ),
    }));
  };

  const addRoom = () => {
    setForm((current) => ({
      ...current,
      rooms: [
        ...current.rooms,
        {
          ...emptyRoom,
        },
      ],
    }));
  };

  const removeRoom = (index) => {
    setForm((current) => ({
      ...current,

      rooms: current.rooms.filter(
        (_, roomIndex) =>
          roomIndex !== index
      ),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Basic Information */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800">
            Basic Information
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Enter the hotel and account holder
            information.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <Input
            label="User Name"
            required
            value={form.userName}
            onChange={(e) =>
              updateField(
                "userName",
                e.target.value
              )
            }
            placeholder="Ahmed Khan"
          />

          <Input
            label="Hotel Name"
            required
            value={form.hotelName}
            onChange={(e) =>
              updateField(
                "hotelName",
                e.target.value
              )
            }
            placeholder="Grand Makkah Hotel"
          />

          <Select
            label="City"
            required
            value={form.city}
            onChange={(e) =>
              updateField(
                "city",
                e.target.value
              )
            }
            options={[
              "Makkah",
              "Madinah",
              "Jeddah",
              "Riyadh",
              "Dammam",
            ]}
          />

          <Select
            label="Star Rating"
            value={form.starRating}
            onChange={(e) =>
              updateField(
                "starRating",
                Number(e.target.value)
              )
            }
            options={[
              1,
              2,
              3,
              4,
              5,
            ]}
          />

          <Input
            label="Phone"
            required
            value={form.phone}
            onChange={(e) =>
              updateField(
                "phone",
                e.target.value
              )
            }
            placeholder="+966 50 123 4567"
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) =>
              updateField(
                "email",
                e.target.value
              )
            }
            placeholder="hotel@example.com"
          />

          <div className="md:col-span-2">
            <Input
              label="Address"
              required
              value={form.address}
              onChange={(e) =>
                updateField(
                  "address",
                  e.target.value
                )
              }
              placeholder="Hotel address"
            />
          </div>

          <div className="md:col-span-2">
            <TextArea
              label="Description"
              value={form.description}
              onChange={(e) =>
                updateField(
                  "description",
                  e.target.value
                )
              }
              placeholder="Hotel description..."
            />
          </div>
        </div>
      </section>

      {/* Hotel Settings */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800">
            Hotel Settings
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-3">
          <Input
            label="Check In"
            value={form.checkIn}
            onChange={(e) =>
              updateField(
                "checkIn",
                e.target.value
              )
            }
          />

          <Input
            label="Check Out"
            value={form.checkOut}
            onChange={(e) =>
              updateField(
                "checkOut",
                e.target.value
              )
            }
          />

          <Select
            label="Status"
            value={form.status}
            onChange={(e) =>
              updateField(
                "status",
                e.target.value
              )
            }
            options={[
              "Active",
              "Inactive",
              "Pending",
            ]}
          />
        </div>
      </section>

      {/* Rooms */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">
              Room & Pricing
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Add rooms and their base prices.
            </p>
          </div>

          <button
            type="button"
            onClick={addRoom}
            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
          >
            + Add Room
          </button>
        </div>

        <div className="space-y-4 p-5">
          {form.rooms.map((room, index) => (
            <div
              key={index}
              className="rounded-lg border border-slate-200 p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  Room {index + 1}
                </h3>

                {form.rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      removeRoom(index)
                    }
                    className="text-xs font-medium text-red-500"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <Input
                  label="Room Name"
                  value={room.name}
                  onChange={(e) =>
                    updateRoom(
                      index,
                      "name",
                      e.target.value
                    )
                  }
                  placeholder="Deluxe Room"
                />

                <Input
                  label="Capacity"
                  type="number"
                  value={room.capacity}
                  onChange={(e) =>
                    updateRoom(
                      index,
                      "capacity",
                      Number(e.target.value)
                    )
                  }
                />

                <Input
                  label="Price"
                  type="number"
                  value={room.price}
                  onChange={(e) =>
                    updateRoom(
                      index,
                      "price",
                      e.target.value
                    )
                  }
                  placeholder="850"
                />

                <Select
                  label="Currency"
                  value={room.currency}
                  onChange={(e) =>
                    updateRoom(
                      index,
                      "currency",
                      e.target.value
                    )
                  }
                  options={[
                    "SAR",
                    "INR",
                    "USD",
                    "AED",
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Submit */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {submitText}
        </button>
      </div>
    </form>
  );
}

function Input({
  label,
  required,
  ...props
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <input
        {...props}
        className="
          w-full rounded-lg
          border border-slate-200
          bg-white
          px-3 py-2.5
          text-sm text-slate-800
          outline-none
          transition
          placeholder:text-slate-400
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-100
        "
      />
    </label>
  );
}

function Select({
  label,
  options,
  ...props
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </span>

      <select
        {...props}
        className="
          w-full rounded-lg
          border border-slate-200
          bg-white
          px-3 py-2.5
          text-sm
          outline-none
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-100
        "
      >
        <option value="">
          Select {label}
        </option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  ...props
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </span>

      <textarea
        {...props}
        rows={4}
        className="
          w-full rounded-lg
          border border-slate-200
          px-3 py-2.5
          text-sm
          outline-none
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-100
        "
      />
    </label>
  );
}