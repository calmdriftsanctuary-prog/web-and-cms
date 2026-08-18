'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

interface PopupData {
  is_active: boolean;
  title: string;
  description: string;
  button_text?: string;
  link_url?: string;
}

export default function PromoPopup() {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/admin/bookings?bookings=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.popup && data.popup.is_active) {
          setPopup(data.popup);
          // Check session storage so it only pops up once per browser session
          const dismissed = sessionStorage.getItem('promo_popup_dismissed');
          if (!dismissed) {
            setIsOpen(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('promo_popup_dismissed', 'true');
  };

  if (!isOpen || !popup) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl border border-[#E5E7EB] relative">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-black transition p-1"
          aria-label="Close popup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2 text-center pt-2">
          <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#6B8E70] bg-[#FAF9F6] px-3 py-1 rounded-full border border-[#E5E7EB]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Special Announcement</span>
          </span>
          <h3 className="font-serif text-2xl text-[#2C332B] mt-2">{popup.title}</h3>
          <p className="text-xs sm:text-sm font-light text-[#6B7280] leading-relaxed px-2">
            {popup.description}
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleClose}
            className="w-full py-3.5 bg-[#6B8E70] text-white font-semibold text-xs uppercase tracking-widest rounded-full hover:bg-[#5B7B60] transition shadow-sm"
          >
            {popup.button_text || 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}