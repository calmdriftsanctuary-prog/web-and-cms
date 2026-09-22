'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface LoyaltyCard {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  pass_serial: string;
  stamps_count: number;
  total_visits: number;
  rewards_redeemed: number;
}

interface ScanHistory {
  id: string;
  client_email: string;
  action_type: string;
  previous_stamps: number;
  new_stamps: number;
  scanned_at: string;
}

export default function AdminLoyaltyPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<any>(null);

  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [history, setHistory] = useState<ScanHistory[]>([]);

  const loadLoyaltyData = async () => {
    try {
      const res = await fetch('/api/admin/loyalty/list');
      const data = await res.json();
      if (data.cards) setCards(data.cards);
      if (data.history) setHistory(data.history);
    } catch (err) {
      console.error('failed to load loyalty data', err);
    }
  };

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResultMessage(null);

    try {
      const res = await fetch('/api/admin/loyalty/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed to process scan');

      setResultMessage(data);
      setIdentifier('');
      loadLoyaltyData();
    } catch (err: any) {
      setResultMessage({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans p-6 sm:p-10 max-w-5xl mx-auto space-y-8 lowercase">
      <header className="flex justify-between items-center border-b pb-4">
        <div className="space-y-1">
          <Link href="/admin" className="text-xs uppercase text-[#693F00] font-semibold">&larr; back to admin portal</Link>
          <h1 className="font-serif text-3xl">loyalty passes & crm scanner</h1>
        </div>
      </header>

      {/* Scanner Box */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border shadow-sm space-y-4">
        <h2 className="font-serif text-xl">scan client pass</h2>
        <p className="text-xs text-gray-500">enter client email, phone number, or pass serial to add a stamp or process a 9th visit reward.</p>

        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">client email or phone number</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. client@email.com or 07123456789"
              className="w-full p-3 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#693F00] text-white text-xs font-semibold uppercase tracking-widest rounded-full hover:bg-[#523100] transition disabled:opacity-50"
          >
            {loading ? 'processing scan...' : 'process client visit scan'}
          </button>
        </form>

        {resultMessage && (
          <div className={`p-4 rounded-xl text-xs font-medium ${resultMessage.error ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
            {resultMessage.error ? (
              <p>error: {resultMessage.error}</p>
            ) : (
              <div className="space-y-1">
                <p className="font-bold text-sm">success: {resultMessage.clientName}</p>
                {resultMessage.action === 'reward_redeemed' ? (
                  <p className="text-emerald-700 font-bold">🎉 9th visit reached! 50% off reward redeemed and card reset to 0/8 stamps.</p>
                ) : (
                  <p>stamp added! current progress: {resultMessage.newStamps}/8 stamps.</p>
                )}
                <p className="text-[10px] text-gray-500">total lifetime visits: {resultMessage.totalVisits} | total rewards claimed: {resultMessage.rewardsRedeemed}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Cards Overview */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border shadow-sm space-y-4">
        <h2 className="font-serif text-xl">active client loyalty profiles ({cards.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="pb-3 font-semibold">client name</th>
                <th className="pb-3 font-semibold">email</th>
                <th className="pb-3 font-semibold">phone</th>
                <th className="pb-3 font-semibold">stamps</th>
                <th className="pb-3 font-semibold">total visits</th>
                <th className="pb-3 font-semibold">rewards claimed</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cards.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">{c.client_name}</td>
                  <td className="py-3 text-gray-600">{c.client_email}</td>
                  <td className="py-3 text-gray-600">{c.client_phone}</td>
                  <td className="py-3 font-bold text-[#693F00]">{c.stamps_count}/8</td>
                  <td className="py-3">{c.total_visits}</td>
                  <td className="py-3">{c.rewards_redeemed}</td>
                </tr>
              ))}
              {cards.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">no loyalty profiles registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit History Log */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border shadow-sm space-y-4">
        <h2 className="font-serif text-xl">scan audit history log</h2>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b text-gray-500 sticky top-0 bg-white">
              <tr>
                <th className="pb-3 font-semibold">timestamp</th>
                <th className="pb-3 font-semibold">client email</th>
                <th className="pb-3 font-semibold">action</th>
                <th className="pb-3 font-semibold">progress change</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="py-3 text-gray-500">{new Date(h.scanned_at).toLocaleString('en-GB')}</td>
                  <td className="py-3 text-gray-900">{h.client_email}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${h.action_type === 'reward_redeemed' ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-emerald-100 text-emerald-800'}`}>
                      {h.action_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3">{h.previous_stamps} &rarr; {h.new_stamps}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">no scan history recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}