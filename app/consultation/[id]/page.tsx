'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options?: string;
  is_required: boolean;
}

interface ConsultationForm {
  id: string;
  title: string;
  description: string;
  consultation_questions: Question[];
}

export default function ConsultationPage() {
  const params = useParams();
  const id = params?.id as string;

  const [consultation, setConsultation] = useState<ConsultationForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [responses, setResponses] = useState<Record<string, any>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/consultation?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setConsultation(data.consultation);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load consultation', err);
        setError('Failed to load consultation form.');
        setLoading(false);
      });
  }, [id]);

  const handleInputChange = (questionId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: id,
          clientName,
          clientEmail,
          clientPhone,
          dateOfBirth,
          responses: {
            ...responses,
            date_of_birth: dateOfBirth,
            'Date of Birth': dateOfBirth,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit consultation.');

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-sans text-[#2C332B]">
        <div className="text-xs uppercase tracking-widest text-gray-400">loading consultation form...</div>
      </div>
    );
  }

  if (error && !consultation) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-sans p-6">
        <div className="bg-white p-6 rounded-2xl border border-red-200 text-center max-w-md w-full space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="font-serif text-xl text-gray-900">Form Not Found</h2>
          <p className="text-xs text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-sans p-6">
        <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] text-center max-w-md w-full space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl text-gray-900">Submission Received</h2>
          <p className="text-sm text-gray-600">Thank you, {clientName}. Your consultation details have been securely recorded for your upcoming sanctuary visit.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-widest text-[#693F00]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Calm Drift Sanctuary</span>
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-gray-900 font-bold tracking-tight">
            {consultation?.title || 'Client Consultation'}
          </h1>
          {consultation?.description && (
            <p className="text-sm text-gray-600 max-w-lg mx-auto font-light leading-relaxed">
              {consultation.description}
            </p>
          )}
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
          {error && <div className="mb-6 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 pb-6 border-b border-[#E5E7EB]">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#693F00]">Personal Information</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1 text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1 text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1 text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                    placeholder="07123 456789"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-1 text-gray-700">
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
              </div>
            </div>

            {consultation?.consultation_questions && consultation.consultation_questions.length > 0 && (
              <div className="space-y-6 pt-2">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#693F00]">Health & Lifestyle Questions</h2>
                
                {consultation.consultation_questions.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-800">
                      {q.question_text} {q.is_required && <span className="text-red-500">*</span>}
                    </label>

                    {q.question_type === 'textarea' ? (
                      <textarea
                        required={q.is_required}
                        rows={3}
                        value={responses[q.id] || ''}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                      />
                    ) : q.question_type === 'select' && q.options ? (
                      <select
                        required={q.is_required}
                        value={responses[q.id] || ''}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                      >
                        <option value="">Select an option...</option>
                        {q.options.split(',').map((opt, i) => (
                          <option key={i} value={opt.trim()}>{opt.trim()}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required={q.is_required}
                        value={responses[q.id] || ''}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#693F00] text-white text-xs font-semibold uppercase tracking-widest rounded-full hover:bg-[#523100] transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting Form...' : 'Submit Consultation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}