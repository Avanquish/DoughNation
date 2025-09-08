// DonationTracking.jsx
import React from "react";

const DonationTracking = ({ currentStatus }) => {
  const steps = [
    { id: 1, label: "Being Packed", statusKey: "being_packed" },
    { id: 2, label: "Ready for Pickup", statusKey: "ready_for_pickup" },
    { id: 3, label: "In Transit", statusKey: "in_transit" },
  ];

  const currentIndex = steps.findIndex(step => step.statusKey === currentStatus);

  return (
    <div className="flex items-center justify-between w-full mt-4">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex-1 flex flex-col items-center relative">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white ${
              idx <= currentIndex ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            {idx + 1}
          </div>
          <span className="mt-2 text-sm text-center">{step.label}</span>

          {idx < steps.length - 1 && (
            <div
              className={`absolute top-4 left-1/2 -translate-x-1/2 h-1 ${
                idx < currentIndex ? "bg-blue-600" : "bg-gray-300"
              } w-full z-0`}
            ></div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DonationTracking;
