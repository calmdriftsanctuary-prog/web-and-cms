'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Sparkles, Send } from 'lucide-react';

interface FormFieldConfig {
  id: string;
  field_name: string;
  field_label: string;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
}

export default function ConsultationPage() {
  const params = useParams();
  const bookingId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [fieldConfigs, setFieldConfigs] = useState<FormFieldConfig[]>([]);

  const [dateOfBirth, setDateOfBirth] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [pressurePreference, setPressurePreference] = useState('Standard');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/consultation?bookingId=${bookingId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setBookingDetails(data.booking);
          setFieldConfigs(data.fieldConfigs || [
            { id: 'c-1', field_name: 'date_of_birth', field_label: 'Date of Birth', is_required: true, is_active: true, display_order: 0 },
            { id: 'c-2', field_name: 'medical_conditions', field_label: 'Medical Conditions / Injuries', is_required: false, is_active: true, display_order: 1 },
            { id: 'c-3', field_name: 'allergies', field_label: 'Allergies', is_required: false, is_active: true, display_order: 2 },
            { id: 'c-4', field_name: 'pressure_preference', field_label: 'Massage Pressure Preference', is_required: false, is_active: true, display_order: 3 },
            { id: 'c-5', field_name: 'emergency_contact', field_label: 'Emergency Contact Details', is_required: true, is_active: true, display_order: 4 },
          ]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load consultation session.');
        setLoading(false);
      });
  }, [bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          dateOfBirth,
          medicalConditions,
          allergies,
          pressurePreference,
          emergencyContact,
          responses: customResponses
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit consultation form.');

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !bookingDetails) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-sans text-[#2C332B]">
        <div className="text-xs uppercase tracking-widest text-gray-400">loading consultation form...</div>
      </div>
    );
  }

  if (error && !bookingDetails) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-sans text-[#2C332B] p-6">
        <div className="bg-white p-8 rounded-2xl border max-w-md w-full text-center space-y-3">
          <h2 className="font-serif text-xl text-red-600">Unable to Load Form</h2>
          <p className="text-xs text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto bg-white p-6 sm:p-10 rounded-2xl border shadow-sm space-y-6">
        <div className="text-center space-y-2 border-b pb-6">
          <div className="flex justify-center mb-1">
            <img src="/logo.png" alt="Sanctuary Logo" className="h-12 w-auto object-contain" />
          </div>
          <span className="inline-flex items-center space-x-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#693F00]">
            <Sparkles className="w-3 h-3" />
            <span>Calm Drift Sanctuary Intake</span>
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-gray-900">Client Consultation Form</h1>
          {bookingDetails && (
            <p className="text-xs text-gray-500">
              Welcome, {bookingDetails.client_name} • Treatment: {bookingDetails.treatments?.title || 'Sanctuary Session'}
            </p>
          )}
        </div>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold">Consultation Submitted</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Thank you for providing your details. Our practitioners have received your intake form and look forward to welcoming you to the sanctuary.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">{error}</div>}

            <div className="p-3 bg-[#FAF9F6] rounded-xl border text-xs text-gray-600 mb-4">
              Please complete this brief wellness intake prior to your appointment so we can tailor your treatment safely.
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-700">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-700">
                Medical Conditions / Recent Injuries
              </label>
              <textarea
                rows={3}
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
                placeholder="Please list any conditions, surgeries, or injuries..."
                className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-700">
                Allergies or Product Sensitivities
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Nut oils, latex, scents"
                className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-700">
                Massage Pressure Preference
              </label>
              <select
                value={pressurePreference}
                onChange={(e) => setPressurePreference(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
              >
                <option value="Light">Light & Gentle</option>
                <option value="Standard">Standard / Medium</option>
                <option value="Firm">Firm / Deep Tissue</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-700">
                Emergency Contact Details <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Name and phone number"
                className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#693F00] text-white text-xs font-semibold uppercase tracking-widest rounded-full hover:bg-[#523100] transition shadow-sm disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Consultation Form'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}