'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, CheckCircle } from 'lucide-react';

export default function LoyaltySignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/loyalty/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed to register pass.');

      setSuccessData(data);
    } catch (err: any) {
      setError(err.message || 'something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans flex items-center justify-center p-6 selection:bg-[#693F00] selection:text-white lowercase">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold tracking-widest text-[#693F00]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>calm drift sanctuary</span>
          </span>
          <h1 className="font-serif text-3xl">digital loyalty card</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            join our sanctuary rewards program. collect 8 stamps, and unlock your 50% off reward on your 9th visit!
          </p>
        </div>

        {successData ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold">pass created successfully!</h3>
            <p className="text-xs text-gray-600">
              we have automatically sent your digital card links straight to your email inbox. you can also install your pass right now below:
            </p>
            <div className="space-y-2 pt-2">
              {successData.applePassUrl && (
                <a href={successData.applePassUrl} target="_blank" rel="noopener noreferrer" className="block w-full py-3 bg-black text-white text-xs tracking-widest rounded-full font-semibold text-center uppercase">
                  add to apple wallet
                </a>
              )}
              {successData.googlePassUrl && (
                <a href={successData.googlePassUrl} target="_blank" rel="noopener noreferrer" className="block w-full py-3 bg-[#693F00] text-white text-xs tracking-widest rounded-full font-semibold text-center uppercase">
                  save to google wallet
                </a>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">{error}</div>}

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. alex smith"
                className="w-full p-3 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. client@example.com"
                className="w-full p-3 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 07123456789"
                className="w-full p-3 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#693F00] text-white text-xs font-semibold uppercase tracking-widest rounded-full hover:bg-[#523100] transition disabled:opacity-50 shadow-sm"
            >
              {loading ? 'generating your pass...' : 'get my digital loyalty card'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}