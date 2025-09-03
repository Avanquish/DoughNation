import React, { useEffect, useState } from "react";

const steps = [
  { key: "being_packed", label: "Being Packed" },
  { key: "ready_pickup", label: "Ready for Pickup" },
  { key: "in_transit", label: "In Transit" },
  { key: "received", label: "Received" },
  { key: "completed", label: "Completed" },
];

const DonationTracker = ({ currentStatus }) => {
  // currentStatus comes from backend via WebSocket (e.g., "in_transit")
  const [activeStep, setActiveStep] = useState(currentStatus);

  useEffect(() => {
    setActiveStep(currentStatus);
  }, [currentStatus]);

  const isStepActive = (stepKey) => {
    const stepIndex = steps.findIndex((s) => s.key === stepKey);
    const activeIndex = steps.findIndex((s) => s.key === activeStep);
    return stepIndex <= activeIndex;
  };

  return (
    <div className="flex items-center justify-between w-full px-8 py-6 bg-white shadow-lg rounded-2xl">
      {steps.map((step, index) => (
        <div key={step.key} className="flex-1 flex flex-col items-center relative">
          {/* Connector Line */}
          {index !== 0 && (
            <div
              className={`absolute left-0 top-5 w-full h-1 ${
                isStepActive(step.key) ? "bg-green-500" : "bg-gray-300"
              }`}
              style={{ zIndex: -1 }}
            />
          )}

          {/* Circle */}
          <div
            className={`w-10 h-10 flex items-center justify-center rounded-full border-2 ${
              isStepActive(step.key)
                ? "bg-green-500 border-green-500 text-white"
                : "bg-gray-200 border-gray-400 text-gray-500"
            }`}
          >
            {index + 1}
          </div>

          {/* Label */}
          <p
            className={`mt-2 text-sm font-medium ${
              isStepActive(step.key) ? "text-green-600" : "text-gray-500"
            }`}
          >
            {step.label}
          </p>
        </div>
      ))}
    </div>
  );
};

export default DonationTracker;
