'use client';

import React, { useState } from 'react';

export default function CampaignSignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/campaign/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sign up.');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-serif text-3xl font-bold lowercase">join our campaign</h1>
          <p className="text-xs text-gray-500 lowercase">sign up to receive exclusive marketing updates and news.</p>
        </div>

        {success ? (
          <div className="text-center py-8 space-y-3 lowercase">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto font-bold text-lg">✓</div>
            <h3 className="font-serif text-xl font-bold">you're on the list!</h3>
            <p className="text-xs text-gray-600">thank you for signing up. your preferences have been successfully updated.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 lowercase">
            {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">{error}</div>}

            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-700 mb-1">first name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                placeholder="enter your first name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-700 mb-1">last name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                placeholder="enter your last name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-700 mb-1">email address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                placeholder="enter your email address"
              />
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed pt-1">
              by submitting this form, you are opting in to receive marketing communications and updates from calm drift sanctuary. you can unsubscribe at any time.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#693F00] text-white text-xs font-semibold tracking-widest rounded-full hover:bg-[#523100] transition shadow-sm disabled:opacity-50 mt-2"
            >
              {submitting ? 'subscribing...' : 'subscribe to updates'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}