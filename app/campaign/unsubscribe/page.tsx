'use client';

import React, { useState } from 'react';

export default function UnsubscribePage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/campaign/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unsubscribe.');

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
          <h1 className="font-serif text-3xl font-bold lowercase">unsubscribe</h1>
          <p className="text-xs text-gray-500 lowercase">we are sorry to see you go. enter your email below to opt out of marketing communications.</p>
        </div>

        {success ? (
          <div className="text-center py-8 space-y-3 lowercase">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto font-bold text-lg">✓</div>
            <h3 className="font-serif text-xl font-bold">successfully unsubscribed</h3>
            <p className="text-xs text-gray-600">your email address has been removed from our marketing list.</p>
          </div>
        ) : (
          <form onSubmit={handleUnsubscribe} className="space-y-4 lowercase">
            {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">{error}</div>}

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

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gray-900 text-white text-xs font-semibold tracking-widest rounded-full hover:bg-black transition shadow-sm disabled:opacity-50"
            >
              {submitting ? 'processing...' : 'confirm unsubscribe'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}