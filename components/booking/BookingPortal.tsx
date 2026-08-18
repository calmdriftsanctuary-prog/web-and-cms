'use client';

import React, { useState, useEffect } from 'react';
import { Clock, ChevronRight, CheckCircle2, Sparkles, X, Tag } from 'lucide-react';

interface Treatment {
  id: string;
  title: string;
  duration_minutes: number;
  price_gbp: number;
  description: string;
  discount_active?: boolean;
  discount_percent?: number;
}

interface CustomField {
  id: string;
  form_type: string;
  field_label: string;
  field_type: string;
  options: string;
  is_required: boolean;
}

export default function BookingPortal() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', notes: '' });
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch('/api/treatments')
      .then((res) => res.json())
      .then((data) => {
        setTreatments(data.treatments || []);
        setCustomFields(data.customFields || []);
        setTemplates(data.templates || {});
      })
      .catch((err) => console.error('Failed to load portal data', err));
  }, []);

  useEffect(() => {
    if (selectedDate && selectedTreatment) {
      setLoadingSlots(true);
      fetch(`/api/availability?date=${selectedDate}&duration=${selectedTreatment.duration_minutes}`)
        .then((res) => res.json())
        .then((data) => {
          setAvailableSlots(data.slots || []);
          setLoadingSlots(false);
        })
        .catch(() => setLoadingSlots(false));
    }
  }, [selectedDate, selectedTreatment]);

  const handleDynamicChange = (fieldId: string, value: any) => {
    setDynamicAnswers({ ...dynamicAnswers, [fieldId]: value });
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentId: selectedTreatment?.id,
          clientName: formData.name,
          clientEmail: formData.email,
          clientPhone: formData.phone,
          startTime: selectedSlot,
          durationMinutes: selectedTreatment?.duration_minutes,
          notes: formData.notes,
          customAnswers: dynamicAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Booking Error: ${data.error || 'Server error occurred'}`);
      } else {
        setStep(4);
      }
    } catch (err) {
      alert(`Network error: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bookingFields = customFields.filter((f) => f.form_type === 'booking');

  return (
    <div className="w-full max-w-4xl mx-auto font-sans">
      <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm p-6 sm:p-10 font-sans">
        {/* STEP 1: SELECT TREATMENT */}
        {step === 1 && (
          <div className="grid gap-4">
            {treatments.map((item) => {
              const isDiscounted = item.discount_active && item.discount_percent;
              const finalPrice = isDiscounted ? (item.price_gbp - (item.price_gbp * item.discount_percent!) / 100).toFixed(0) : item.price_gbp;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedTreatment(item)}
                  className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    selectedTreatment?.id === item.id ? 'border-[#6B8E70] bg-[#FAF9F6] shadow-sm' : 'border-[#E5E5EB] bg-white hover:border-[#6B8E70]/40'
                  }`}
                >
                  <div className="space-y-1">
                    <h3 className="font-serif text-xl sm:text-2xl text-[#2C332B]">{item.title}</h3>
                    <p className="text-xs sm:text-sm font-light text-[#6B7280]">{item.description}</p>
                    <div className="flex items-center space-x-4 pt-2 text-xs text-[#2C332B]">
                      <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1 text-[#6B8E70]" /> {item.duration_minutes} mins</span>
                      <span className="font-semibold text-[#5B7B60]">£{finalPrice}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#6B8E70] hidden sm:block" />
                </div>
              );
            })}
            <button
              disabled={!selectedTreatment}
              onClick={() => setStep(2)}
              className="mt-6 w-full py-4 bg-[#6B8E70] text-white font-semibold text-xs uppercase tracking-widest rounded-full hover:bg-[#5B7B60] transition shadow-sm disabled:opacity-40"
            >
              Select Date & Time
            </button>
          </div>
        )}

        {/* STEP 2: DATE & TIME */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-2">Select Treatment Date</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm"
              />
            </div>
            {selectedDate && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-2">Available Appointments</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {loadingSlots ? (
                    <p className="col-span-3 text-center py-6 text-xs text-[#6B7280]">Checking availability...</p>
                  ) : availableSlots.length === 0 ? (
                    <p className="col-span-3 text-center py-6 text-xs text-[#6B7280]">No slots available.</p>
                  ) : (
                    availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3 text-xs font-medium rounded-lg border transition ${
                          selectedSlot === slot ? 'bg-[#6B8E70] text-white border-[#6B8E70]' : 'bg-white border-[#E5E7EB]'
                        }`}
                      >
                        {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </button>
                    ))
                  )}
                </div>
                
                {/* Advance notice & Instagram contact helper text */}
                <p className="text-[11px] text-[#6B7280] italic mt-3 leading-relaxed">
                  Appointments not booked more than 24 hours in advance will need to be confirmed by getting in touch with us via our Instagram account, @calmdriftsanctuary.
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep(1)} className="w-1/2 py-3.5 border rounded-full text-xs uppercase">Back</button>
              <button disabled={!selectedSlot} onClick={() => setStep(3)} className="w-1/2 py-3.5 bg-[#6B8E70] text-white rounded-full text-xs uppercase disabled:opacity-40">Continue</button>
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS & CUSTOM FIELDS */}
        {step === 3 && (
          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Full Name *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3.5 border rounded-xl text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Email Address *</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full p-3.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Phone Number *</label>
                <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3.5 border rounded-xl text-sm" />
              </div>
            </div>

            {/* RENDER DYNAMIC CUSTOM FIELDS */}
            {bookingFields.map((field) => (
              <div key={field.id} className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B]">
                  {field.field_label} {field.is_required && '*'}
                </label>
                {field.field_type === 'text' && (
                  <input
                    type="text"
                    required={field.is_required}
                    value={dynamicAnswers[field.id] || ''}
                    onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                    className="w-full p-3.5 border rounded-xl text-sm"
                  />
                )}
                {field.field_type === 'checkbox' && (
                  <label className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      required={field.is_required}
                      checked={!!dynamicAnswers[field.id]}
                      onChange={(e) => handleDynamicChange(field.id, e.target.checked)}
                      className="h-4 w-4 text-[#6B8E70] rounded"
                    />
                    <span className="text-xs text-[#6B7280]">Yes / Confirm</span>
                  </label>
                )}
                {field.field_type === 'dropdown' && (
                  <select
                    required={field.is_required}
                    value={dynamicAnswers[field.id] || ''}
                    onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                    className="w-full p-3.5 border rounded-xl text-sm bg-white"
                  >
                    <option value="">Select option...</option>
                    {field.options.split(',').map((opt) => (
                      <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Special Notes</label>
              <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full p-3.5 border rounded-xl text-sm" />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setStep(2)} className="w-1/2 py-3.5 border rounded-full text-xs uppercase">Back</button>
              <button type="submit" disabled={isSubmitting} className="w-1/2 py-3.5 bg-[#6B8E70] text-white rounded-full text-xs uppercase disabled:opacity-40">
                {isSubmitting ? 'Confirming...' : 'Complete Reservation'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: CONFIRMATION & CMS THANK-YOU MESSAGE */}
        {step === 4 && (
          <div className="text-center py-10 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-[#6B8E70] mx-auto" />
            <h3 className="font-serif text-2xl sm:text-3xl text-[#2C332B]">reservation confirmed</h3>
            <p className="text-xs sm:text-sm font-light text-[#6B7280] max-w-md mx-auto leading-relaxed">
              {templates.booking_thankyou || `Thank you, ${formData.name}. Your reservation is confirmed!`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}