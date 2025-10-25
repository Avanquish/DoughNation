import React from "react";
import { Dialog } from "@headlessui/react";
import { CheckCircle } from "lucide-react";

const UnlockModalBadge = ({ badge, onClose }) => {
  if (!badge) return null;

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      {/* Modal content */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
          <Dialog.Title className="text-2xl font-bold text-green-600">
            🎉 Badge Unlocked!
          </Dialog.Title>
          <div className="mt-4">
            <img
              src={
                badge.icon_url
                  ? `http://localhost:8000/${badge.icon_url}`
                  : "/placeholder-badge.png"
              }
              alt={badge.name}
              className="w-24 h-24 mx-auto"
            />
            <h3 className="mt-4 text-xl font-semibold">{badge.name}</h3>
            <p className="text-gray-600">{badge.description}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-6 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Close
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default UnlockModalBadge;
