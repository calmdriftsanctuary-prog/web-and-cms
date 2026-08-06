'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';

export default function ConsultationPage() {
  const params = useParams();
  const bookingId = params?.id as string;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medicalConditions: '',
    allergies: '',
    pressurePreference: 'Medium',
    emergencyContact: '',
    consent: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) {
      alert('Please confirm consent to proceed.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          ...formData,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert('Failed to submit form. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while submitting.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] py-16 px-6 font-sans flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center space-y-4 shadow-sm">
          <CheckCircle className="w-16 h-16 text-[#6B8E70] mx-auto" />
          <h2 className="font-serif text-3xl text-[#2C332B]">Consultation Complete</h2>
          <p className="text-sm text-[#6B7280] font-light leading-relaxed">
            Thank you for completing your pre-treatment health intake. Your response has been securely linked to your sanctuary reservation.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans py-12 px-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
        <div className="text-center mb-8 space-y-2">
          <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#6B8E70]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pre-Treatment Intake</span>
          </span>
          <h1 className="font-serif text-3xl text-[#2C332B] font-normal">
            Digital Health Consultation
          </h1>
          <p className="text-xs text-[#6B7280] font-light max-w-md mx-auto">
            Please share your health preferences and medical history to ensure a safe, tailored holistic experience.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-2">
              Medical Conditions / Injuries / Surgeries
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Lower back stiffness, high blood pressure, recent operations..."
              value={formData.medicalConditions}
              onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
              className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8E70]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-2">
              Allergies or Skin Sensitivities
            </label>
            <input
              type="text"
              placeholder="e.g. Nut oils, essential oils, latex..."
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8E70]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-2">
              Massage Pressure Preference
            </label>
            <select
              value={formData.pressurePreference}
              onChange={(e) => setFormData({ ...formData, pressurePreference: e.target.value })}
              className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8E70]"
            >
              <option value="Gentle">Gentle / Light</option>
              <option value="Medium">Medium / Balanced</option>
              <option value="Firm">Firm / Deep Tissue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-2">
              Emergency Contact (Name & Phone)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Jane Doe - 07123 456789"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B8E70]"
            />
          </div>

          <div className="p-4 bg-[#FAF9F6] rounded-xl border border-[#E5E7EB] flex items-start space-x-3">
            <input
              type="checkbox"
              id="consent"
              required
              checked={formData.consent}
              onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#6B8E70] focus:ring-[#6B8E70]"
            />
            <label htmlFor="consent" className="text-xs text-[#6B7280] font-light leading-relaxed cursor-pointer">
              I confirm that the health information provided above is accurate to the best of my knowledge. I understand that treatments are for relaxation and wellness purposes.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#6B8E70] text-white font-semibold text-xs uppercase tracking-widest rounded-full hover:bg-[#5B7B60] transition shadow-sm disabled:opacity-40"
          >
            {loading ? 'Submitting...' : 'Complete Health Form'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-[#6B7280]">
          <ShieldCheck className="w-4 h-4 text-[#6B8E70]" />
          <span>Your medical information is kept strictly confidential.</span>
        </div>
      </div>
    </main>
  );
}