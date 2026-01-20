import React from "react";
import { Dialog } from "@headlessui/react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ThresholdAlertModal = ({ product, onDonate, onReject }) => {
  if (!product) return null;

  const imageUrl = product.image 
    ? `http://localhost:8000/${product.image}` 
    : "/placeholder-product.png";

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Dialog open={true} onClose={() => {}} className="relative z-50">
      {/* Backdrop - Make it brighter to draw attention */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
        aria-hidden="true" 
      />
      
      {/* Modal content */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative bg-gradient-to-br from-white to-[#FFF9F0] rounded-2xl shadow-2xl p-8 w-full max-w-lg border-4 border-[#E49A52]">
          {/* Close button (optional, but modal should stay until action) */}
          <button
            onClick={onReject}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[#6B4B2B]" />
          </button>

          {/* Alert Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <AlertCircle 
                className="text-[#E49A52] animate-pulse" 
                size={80} 
                strokeWidth={2.5}
              />
              <div className="absolute inset-0 animate-ping">
                <AlertCircle 
                  className="text-[#E49A52] opacity-40" 
                  size={80} 
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <Dialog.Title className="text-2xl font-bold text-[#6B4B2B] text-center mb-2">
            🤝 Donation Opportunity
          </Dialog.Title>

          {/* Description */}
          <div className="text-center mb-6">
            <p className="text-[#8B6A49] text-base font-medium">
              Your product is reaching its expiration date soon.
            </p>
            <p className="text-[#8B6A49] text-sm mt-1">
              Would you like to donate it to your partnered NGO <span className="font-bold text-[#6B4B2B]">"Scholars Of Sustenance"</span>?
            </p>
          </div>

          {/* Product Details Card */}
          <div className="bg-white rounded-xl p-4 mb-6 border-2 border-[#f2e3cf] shadow-inner">
            <div className="flex items-start gap-4">
              {/* Product Image */}
              <div className="shrink-0">
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded-lg border-2 border-[#E49A52] shadow-md"
                  onError={(e) => {
                    e.target.src = "/placeholder-product.png";
                  }}
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-[#4A2F17] mb-1 truncate">
                  {product.name}
                </h3>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8B6A49] font-medium">Product ID:</span>
                    <span className="text-[#6B4B2B] font-semibold">{product.product_id}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-[#8B6A49] font-medium">Quantity:</span>
                    <span className="text-[#6B4B2B] font-semibold">{product.quantity} units</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-[#8B6A49] font-medium">Type:</span>
                    <span className="text-[#6B4B2B] font-semibold">{product.donation_type}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-[#8B6A49] font-medium">Created:</span>
                    <span className="text-[#6B4B2B]">{formatDate(product.creation_date)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-[#8B6A49] font-medium">Expires:</span>
                    <span className={`font-bold ${
                      product.days_until_expiration <= 3 
                        ? 'text-red-600' 
                        : 'text-[#E49A52]'
                    }`}>
                      {formatDate(product.expiration_date)}
                      <span className="text-xs ml-1">
                        ({product.days_until_expiration} day{product.days_until_expiration !== 1 ? 's' : ''} left)
                      </span>
                    </span>
                  </div>
                </div>

                {product.description && (
                  <p className="text-xs text-[#8B6A49] mt-2 italic line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-amber-50 border-l-4 border-[#E49A52] p-3 mb-6 rounded">
            <p className="text-sm text-[#6B4B2B] font-medium">
              <span className="font-bold">Note:</span> This reminder will continue to appear 
              until the product expires ({product.days_until_expiration} days remaining) or you choose to donate it.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onReject}
              variant="outline"
              className="flex-1 py-6 text-base font-semibold border-2 border-[#8B6A49] text-[#6B4B2B] hover:bg-[#F5F5F5] hover:border-[#6B4B2B] transition-all"
            >
              Not Now
            </Button>
            
            <Button
              onClick={onDonate}
              className="flex-1 py-6 text-base font-semibold bg-gradient-to-r from-[#E49A52] to-[#BF7327] text-white hover:from-[#BF7327] hover:to-[#A65E1F] shadow-lg hover:shadow-xl transition-all"
            >
              Donate to Scholars Of Sustenance
            </Button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-center text-[#8B6A49] mt-4">
            By donating, you'll help those in need and reduce food waste.
          </p>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ThresholdAlertModal;
