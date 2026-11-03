import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Plane,
  Hotel,
  Utensils,
  FileCheck,
  ShieldCheck,
} from "lucide-react";

const packageComponents = [
  {
    id: "flight",
    name: "Flight",
    description: "Choose your preferred airlines",
    icon: Plane,
    options: [
      {
        id: "indigo",
        name: "IndiGo",
        price: 25000,
      },
      {
        id: "air-india",
        name: "Air India",
        price: 28000,
      },
      {
        id: "emirates",
        name: "Emirates",
        price: 42000,
      },
      {
        id: "qatar",
        name: "Qatar Airways",
        price: 45000,
      },
      {
        id: "etihad",
        name: "Etihad Airways",
        price: 40000,
      },
      {
        id: "vistara",
        name: "Vistara",
        price: 30000,
      },
    ],
  },

  {
    id: "hotel",
    name: "Hotel",
    description: "Choose your preferred hotel",
    icon: Hotel,
    options: [
      {
        id: "hotel-3-star",
        name: "3 Star Hotel",
        price: 8000,
      },
      {
        id: "hotel-4-star",
        name: "4 Star Hotel",
        price: 12000,
      },
      {
        id: "hotel-5-star",
        name: "5 Star Hotel",
        price: 18000,
      },
      {
        id: "hotel-luxury",
        name: "Luxury Hotel",
        price: 25000,
      },
    ],
  },

  {
    id: "food",
    name: "Food",
    description: "Choose your preferred food plan",
    icon: Utensils,
    options: [
      {
        id: "breakfast",
        name: "Breakfast",
        price: 2000,
      },
      {
        id: "lunch",
        name: "Lunch",
        price: 2500,
      },
      {
        id: "dinner",
        name: "Dinner",
        price: 3000,
      },
      {
        id: "full-meal",
        name: "Breakfast + Lunch + Dinner",
        price: 7000,
      },
    ],
  },

  {
    id: "visa",
    name: "Visa",
    description: "Choose your visa type",
    icon: FileCheck,
    options: [
      {
        id: "tourist-visa",
        name: "Tourist Visa",
        price: 3500,
      },
      {
        id: "business-visa",
        name: "Business Visa",
        price: 5000,
      },
      {
        id: "e-visa",
        name: "E-Visa",
        price: 3000,
      },
      {
        id: "express-visa",
        name: "Express Visa",
        price: 6500,
      },
    ],
  },

  {
    id: "insurance",
    name: "Insurance",
    description: "Choose your insurance plan",
    icon: ShieldCheck,
    options: [
      {
        id: "basic-insurance",
        name: "Basic Insurance",
        price: 1000,
      },
      {
        id: "standard-insurance",
        name: "Standard Insurance",
        price: 2000,
      },
      {
        id: "premium-insurance",
        name: "Premium Insurance",
        price: 3500,
      },
      {
        id: "family-insurance",
        name: "Family Insurance",
        price: 5000,
      },
    ],
  },
];

export default function PackageCustomization() {
  
  const [selectedOptions, setSelectedOptions] = useState({
    flight: ["indigo"],
    hotel: ["hotel-3-star"],
    food: ["breakfast"],
    visa: [],
    insurance: ["basic-insurance"],
  });

  /*
   * Enable / Disable components
   */
  const [enabled, setEnabled] = useState({
    flight: true,
    hotel: true,
    food: true,
    visa: true,
    insurance: true,
  });

  /*
   * Which dropdown is open
   */
  const [openDropdown, setOpenDropdown] = useState(null);

  /*
   * Select / Unselect option
   */
  const toggleOption = (componentId, optionId) => {
    if (!enabled[componentId]) return;

    setSelectedOptions((previous) => {
      const currentOptions = previous[componentId] || [];

      const alreadySelected = currentOptions.includes(optionId);

      return {
        ...previous,
        [componentId]: alreadySelected
          ? currentOptions.filter((id) => id !== optionId)
          : [...currentOptions, optionId],
      };
    });
  };

  /*
   * Enable / Disable complete component
   */
  const toggleComponent = (componentId) => {
    setEnabled((previous) => ({
      ...previous,
      [componentId]: !previous[componentId],
    }));

    /*
     * Close dropdown when disabled
     */
    if (enabled[componentId]) {
      setOpenDropdown(null);
    }
  };

  /*
   * Get selected options for a component
   */
  const getSelectedOptions = (component) => {
    const selectedIds = selectedOptions[component.id] || [];

    return component.options.filter((option) =>
      selectedIds.includes(option.id)
    );
  };

  /*
   * Calculate total
   */
  const total = useMemo(() => {
    let amount = 0;

    packageComponents.forEach((component) => {
      if (!enabled[component.id]) return;

      const selectedIds = selectedOptions[component.id] || [];

      component.options.forEach((option) => {
        if (selectedIds.includes(option.id)) {
          amount += option.price;
        }
      });
    });

    return amount;
  }, [selectedOptions, enabled]);

  /*
   * Number of selected components
   */
  const selectedComponentCount = packageComponents.filter(
    (component) =>
      enabled[component.id] &&
      selectedOptions[component.id]?.length > 0
  ).length;

  return (
    <section className="w-full bg-gray-50 py-8 sm:py-10 lg:py-14">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* Main Card */}
        <div className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">

          {/* Header */}
          <div className="border-b border-gray-200 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  Package Customization
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Customize your package according to your preference
                </p>
              </div>

              <div className="w-fit rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600">
                {selectedComponentCount} / {packageComponents.length} Selected
              </div>

            </div>
          </div>

          {/* Components */}
          <div className="divide-y divide-gray-100">

            {packageComponents.map((component) => {
              const Icon = component.icon;

              const isEnabled = enabled[component.id];

              const selected = getSelectedOptions(component);

              const isOpen = openDropdown === component.id;

              return (
                <div
                  key={component.id}
                  className={`
                    relative
                    px-4
                    py-4
                    transition
                    sm:px-7
                    sm:py-5
                    ${
                      isEnabled
                        ? "bg-white"
                        : "bg-gray-50 opacity-60"
                    }
                  `}
                >

                  {/* Component Header */}
                  <div className="flex items-center justify-between gap-3">

                    {/* Left */}
                    <div className="flex min-w-0 items-center gap-3">

                      {/* Component Icon */}
                      <div
                        className={`
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          ${
                            isEnabled
                              ? "bg-blue-50 text-blue-600"
                              : "bg-gray-100 text-gray-400"
                          }
                        `}
                      >
                        <Icon size={20} />
                      </div>

                      {/* Name */}
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                          {component.name}
                        </h3>

                        <p className="hidden text-sm text-gray-500 sm:block">
                          {component.description}
                        </p>

                        {/* Mobile selected count */}
                        <p className="mt-0.5 text-xs text-gray-400 sm:hidden">
                          {selected.length > 0
                            ? `${selected.length} selected`
                            : "None selected"}
                        </p>
                      </div>

                    </div>

                    {/* Right controls */}
                    <div className="flex shrink-0 items-center gap-2 sm:gap-4">

                      {/* Enable / Disable */}
                      <button
                        type="button"
                        onClick={() =>
                          toggleComponent(component.id)
                        }
                        className={`
                          relative
                          h-7
                          w-12
                          rounded-full
                          transition-colors
                          ${
                            isEnabled
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }
                        `}
                        aria-label={
                          isEnabled
                            ? `Disable ${component.name}`
                            : `Enable ${component.name}`
                        }
                      >
                        <span
                          className={`
                            absolute
                            top-1
                            h-5
                            w-5
                            rounded-full
                            bg-white
                            shadow
                            transition-transform
                            ${
                              isEnabled
                                ? "translate-x-6"
                                : "translate-x-1"
                            }
                          `}
                        />
                      </button>

                      {/* Dropdown */}
                      <button
                        type="button"
                        disabled={!isEnabled}
                        onClick={() =>
                          setOpenDropdown(
                            isOpen ? null : component.id
                          )
                        }
                        className={`
                          flex
                          items-center
                          gap-1
                          rounded-lg
                          px-2
                          py-2
                          text-sm
                          font-semibold
                          transition
                          sm:px-3
                          ${
                            isEnabled
                              ? "text-blue-600 hover:bg-blue-50"
                              : "cursor-not-allowed text-gray-400"
                          }
                        `}
                      >
                        <span className="hidden sm:inline">
                          Choose
                        </span>

                        <ChevronDown
                          size={18}
                          className={`
                            transition-transform
                            ${
                              isOpen
                                ? "rotate-180"
                                : ""
                            }
                          `}
                        />
                      </button>

                    </div>
                  </div>

                  {/* Selected Items */}
                  {isEnabled && selected.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 pl-0 sm:pl-[52px]">

                      {selected.map((option) => (
                        <span
                          key={option.id}
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-full
                            bg-gray-100
                            px-3
                            py-1.5
                            text-xs
                            font-medium
                            text-gray-700
                          "
                        >
                          <Check
                            size={13}
                            className="text-green-600"
                          />

                          {option.name}
                        </span>
                      ))}

                    </div>
                  )}

                  {/* Dropdown */}
                  {isOpen && isEnabled && (
                    <div
                      className="
                        mt-4
                        rounded-xl
                        border
                        border-gray-200
                        bg-white
                        p-3
                        shadow-lg
                        sm:ml-[52px]
                      "
                    >

                      {/* Dropdown Header */}
                      <div className="mb-2 flex items-center justify-between border-b border-gray-100 px-2 pb-3">

                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Choose {component.name}
                          </p>

                          <p className="mt-0.5 text-xs text-gray-500">
                            Select one or more options
                          </p>
                        </div>

                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                          {selected.length} Selected
                        </span>

                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">

                        {component.options.map((option) => {
                          const checked = (
                            selectedOptions[component.id] || []
                          ).includes(option.id);

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() =>
                                toggleOption(
                                  component.id,
                                  option.id
                                )
                              }
                              className={`
                                flex
                                items-center
                                justify-between
                                rounded-lg
                                px-3
                                py-3
                                text-left
                                transition
                                ${
                                  checked
                                    ? "bg-blue-50"
                                    : "hover:bg-gray-50"
                                }
                              `}
                            >

                              <div className="flex items-center gap-3">

                                {/* Checkbox */}
                                <span
                                  className={`
                                    flex
                                    h-5
                                    w-5
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded
                                    border-2
                                    transition
                                    ${
                                      checked
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-gray-300 bg-white"
                                    }
                                  `}
                                >
                                  {checked && (
                                    <Check
                                      size={13}
                                      strokeWidth={3}
                                    />
                                  )}
                                </span>

                                <span
                                  className={`
                                    text-sm
                                    font-medium
                                    ${
                                      checked
                                        ? "text-blue-700"
                                        : "text-gray-700"
                                    }
                                  `}
                                >
                                  {option.name}
                                </span>

                              </div>

                              <span className="ml-3 text-sm font-semibold text-gray-900">
                                ₹
                                {option.price.toLocaleString(
                                  "en-IN"
                                )}
                              </span>

                            </button>
                          );
                        })}

                      </div>

                      {/* Dropdown Footer */}
                      <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">

                        <button
                          type="button"
                          onClick={() =>
                            setOpenDropdown(null)
                          }
                          className="
                            rounded-lg
                            bg-blue-600
                            px-4
                            py-2
                            text-sm
                            font-semibold
                            text-white
                            transition
                            hover:bg-blue-700
                          "
                        >
                          Done
                        </button>

                      </div>
                    </div>
                  )}

                </div>
              );
            })}

          </div>

          {/* Total */}
          <div className="border-t border-gray-200 bg-gray-50 px-5 py-5 sm:px-7">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Package Total
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                  ₹{total.toLocaleString("en-IN")}
                </p>
              </div>

              <button
                type="button"
                className="
                  w-full
                  rounded-xl
                  bg-blue-600
                  px-7
                  py-3
                  text-sm
                  font-bold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-blue-700
                  active:scale-[0.98]
                  sm:w-auto
                "
              >
                Continue
              </button>

            </div>

            <p className="mt-3 text-xs text-gray-500">
              Total updates instantly when you select or remove
              any component or option.
            </p>

          </div>

        </div>
      </div>
    </section>
  );
}