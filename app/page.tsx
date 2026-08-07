'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sparkles, CheckCircle, Star } from 'lucide-react';

interface Treatment {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  price_gbp: number;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption?: string;
}

interface Review {
  id: string;
  client_name: string;
  rating: number;
  comment: string;
  is_visible: boolean;
}

export default function HomePage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [content, setContent] = useState<Record<string, string>>({});
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch treatments, page content, gallery images, and reviews on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/bookings?bookings=true').then((res) => res.json()),
      fetch('/api/gallery').then((res) => res.json()).catch(() => ({ images: [] })),
      fetch('/api/reviews').then((res) => res.json()).catch(() => ({ reviews: [] }))
    ])
      .then(([bookingData, galleryData, reviewData]) => {
        if (bookingData.treatments && bookingData.treatments.length > 0) {
          setTreatments(bookingData.treatments);
          setSelectedTreatmentId(bookingData.treatments[0].id);
        }
        if (bookingData.pageContent) {
          const contentMap: Record<string, string> = {};
          bookingData.pageContent.forEach((item: any) => {
            contentMap[item.key] = item.value;
          });
          setContent(contentMap);
        }
        if (galleryData.images) {
          setGalleryImages(galleryData.images);
        }
        if (reviewData.reviews) {
          setReviews(reviewData.reviews.filter((r: Review) => r.is_visible));
        }
        setLoadingInitial(false);
      })
      .catch((err) => {
        console.error('Failed to load initial data', err);
        setLoadingInitial(false);
      });
  }, []);

  // Fetch available slots when treatment or date changes
  useEffect(() => {
    if (!selectedTreatmentId || !selectedDate) return;

    const treatment = treatments.find((t) => t.id === selectedTreatmentId);
    const duration = treatment ? treatment.duration_minutes : 60;

    setLoadingSlots(true);
    fetch(`/api/availability?date=${selectedDate}&duration=${duration}`)
      .then((res) => res.json())
      .then((data) => {
        setAvailableSlots(data.slots || []);
        if (data.slots && data.slots.length > 0) {
          setSelectedSlot(data.slots[0]);
        } else {
          setSelectedSlot('');
        }
        setLoadingSlots(false);
      })
      .catch((err) => {
        console.error('Failed to load slots', err);
        setLoadingSlots(false);
      });
  }, [selectedTreatmentId, selectedDate, treatments]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedTreatmentId) {
      setError('Please select a valid treatment and time slot.');
      return;
    }

    const treatment = treatments.find((t) => t.id === selectedTreatmentId);
    const duration = treatment ? treatment.duration_minutes : 60;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentId: selectedTreatmentId,
          clientName,
          clientEmail,
          clientPhone,
          startTime: selectedSlot,
          durationMinutes: duration,
          notes: `${clientNotes}${marketingConsent ? ' [Marketing Consent: Yes]' : ''}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete booking');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-sans text-[#2C332B]">
        <div className="text-xs uppercase tracking-widest text-gray-400">Loading Sanctuary...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4 font-sans text-[#2C332B]">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold">Booking Confirmed</h1>
          <p className="text-xs text-gray-600">
            Thank you, {clientName}. We have sent your confirmation email and consultation form request to <strong>{clientEmail}</strong>.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setClientName('');
              setClientEmail('');
              setClientPhone('');
              setClientNotes('');
            }}
            className="w-full py-3 bg-[#6B8E70] text-white text-xs uppercase tracking-wider rounded-full hover:bg-[#5B7B60] transition"
          >
            Book Another Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-12 px-4 sm:px-6 lg:px-8 font-sans text-[#2C332B] space-y-16">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* LOGO & HEADER SECTION */}
        <header className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src="/logo.png" 
              alt="Sanctuary Logo" 
              className="h-16 w-auto object-contain" 
            />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif text-3xl sm:text-4xl text-gray-900 font-bold">
              {content.hero_heading || 'Reserve Your Session'}
            </h1>
            <p className="text-sm text-gray-600 max-w-lg mx-auto">
              {content.hero_subtext || 'Select your treatment, date, and time below.'}
            </p>
          </div>
        </header>

        {/* BOOKING FORM CARD */}
        <div className="bg-white p-6 sm:p-10 rounded-2xl border space-y-8 shadow-sm">
          
          <div className="flex items-center justify-between border-b pb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">Online Sanctuary Booking</span>
            <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#6B8E70]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Secure Reservation</span>
            </span>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleBookingSubmit} className="space-y-6">
            {/* Treatment Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2">Select Treatment</label>
              <div className="grid gap-3">
                {treatments.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTreatmentId(t.id)}
                    className={`p-4 border rounded-xl cursor-pointer transition flex justify-between items-center ${
                      selectedTreatmentId === t.id ? 'border-[#6B8E70] bg-emerald-50/40 ring-1 ring-[#6B8E70]' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <h3 className="font-serif text-lg font-medium text-gray-900">{t.title}</h3>
                      <p className="text-xs text-gray-500">{t.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-[#6B8E70]">£{t.price_gbp}</span>
                      <p className="text-[11px] text-gray-400">{t.duration_minutes} mins</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date & Slot Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Booking Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Available Slot</label>
                {loadingSlots ? (
                  <div className="p-3 border rounded-xl text-sm text-gray-400">Loading slots...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-3 border rounded-xl text-sm text-red-500 bg-red-50">No slots available</div>
                ) : (
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="w-full p-3 border rounded-xl text-sm bg-white font-mono"
                    required
                  >
                    {availableSlots.map((slot) => {
                      const d = new Date(slot);
                      const hours = String(d.getUTCHours()).padStart(2, '0');
                      const minutes = String(d.getUTCMinutes()).padStart(2, '0');
                      return (
                        <option key={slot} value={slot}>
                          {hours}:{minutes}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>

            {/* Client Details */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">Your Details</h3>
              
              <div>
                <label className="block text-xs uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                  placeholder="Jane Doe"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full p-3 border rounded-xl text-sm"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full p-3 border rounded-xl text-sm"
                    placeholder="07123 456789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase mb-1">Notes or Special Requests (Optional)</label>
                <textarea
                  rows={2}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                  placeholder="Any specific areas of tension..."
                />
              </div>

              {/* GDPR COMPLIANCE SECTION */}
              <div className="pt-2 space-y-3 bg-gray-50 p-4 rounded-xl border">
                <div className="flex items-start space-x-2.5">
                  <input
                    type="checkbox"
                    id="marketingConsent"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-[#6B8E70] rounded border-gray-300 focus:ring-[#6B8E70]"
                  />
                  <label htmlFor="marketingConsent" className="text-xs text-gray-600 leading-tight cursor-pointer">
                    Yes, I would like to receive exclusive wellness offers and updates via email (Optional).
                  </label>
                </div>

                <p className="text-[11px] text-gray-500 leading-tight">
                  By booking, you agree to our processing of your personal data to fulfill your appointment. 
                  Read our <a href="/privacy" target="_blank" className="underline hover:text-gray-700 font-medium">Privacy Policy</a>.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || availableSlots.length === 0}
              className="w-full py-4 bg-[#6B8E70] text-white text-xs font-semibold uppercase tracking-widest rounded-full hover:bg-[#5B7B60] transition shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Confirming Reservation...' : 'Confirm & Book Session'}
            </button>
          </form>
        </div>
      </div>

      {/* GALLERY SECTION */}
      {galleryImages.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="font-serif text-2xl sm:text-3xl">{content.gallery_heading || 'Sanctuary Gallery'}</h2>
            <p className="text-xs text-gray-500">{content.gallery_subtext || 'A glimpse into our restorative space'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((img) => (
              <div key={img.id} className="overflow-hidden rounded-2xl border shadow-sm bg-white">
                <img src={img.image_url} alt={img.caption || 'Sanctuary'} className="w-full h-64 object-cover hover:scale-105 transition duration-500" />
                {img.caption && <div className="p-3 text-xs text-center text-gray-600">{img.caption}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* REVIEWS SECTION */}
      {reviews.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 space-y-6 pb-12">
          <div className="text-center space-y-1">
            <h2 className="font-serif text-2xl sm:text-3xl">{content.reviews_heading || 'Client Experiences'}</h2>
            <p className="text-xs text-gray-500">{content.reviews_subtext || 'Words from those who have visited our sanctuary'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white p-6 rounded-2xl border shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex text-amber-500">
                    {[...Array(rev.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 italic">"{rev.comment}"</p>
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#6B8E70]">
                  — {rev.client_name}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}