'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Camera, CheckCircle, RefreshCw } from 'lucide-react';

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

  // Camera scanner states
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);

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

    if (!document.getElementById('html5-qrcode-script')) {
      const script = document.createElement('script');
      script.id = 'html5-qrcode-script';
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      stopCamera();
    };
  }, []);

  const processScan = async (code: string) => {
    if (!code || loading) return;
    setLoading(true);
    setResultMessage(null);
    setIdentifier(code);

    try {
      const res = await fetch('/api/admin/loyalty/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: code })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed to process scan');

      setResultMessage(data);
      setIdentifier('');
      loadLoyaltyData();
      stopCamera();
    } catch (err: any) {
      setResultMessage({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = () => {
    setScanning(true);
    setResultMessage(null);

    const checkLib = setInterval(() => {
      const Html5Qrcode = (window as any).Html5Qrcode;
      if (Html5Qrcode) {
        clearInterval(checkLib);

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode('realtime-reader');
        }

        scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText: string) => {
            if (decodedText) {
              processScan(decodedText);
            }
          },
          (errorMessage: string) => {
            // Quietly ignore frame search misses
          }
        ).catch((err: any) => {
          console.error('Camera start error:', err);
          setResultMessage({ error: 'unable to access camera. check permissions.' });
          setScanning(false);
        });
      }
    }, 150);
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
        scannerRef.current = null;
      }).catch(() => {
        scannerRef.current = null;
      });
    }
    setScanning(false);
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
        <div className="flex justify-between items-center">
          <h2 className="font-serif text-xl">scan client pass</h2>
          <button
            onClick={scanning ? stopCamera : startCamera}
            className="px-4 py-2 bg-[#693F00] text-white text-xs uppercase rounded-full font-semibold flex items-center space-x-2"
          >
            <Camera className="w-4 h-4" />
            <span>{scanning ? 'stop camera scanner' : 'open live camera'}</span>
          </button>
        </div>
        <p className="text-xs text-gray-500">hold the client pass QR code in front of the camera for real-time detection, or enter details manually below.</p>

        {/* Real-time camera view target */}
        <div 
          id="realtime-reader" 
          className={`w-full max-w-md mx-auto rounded-xl overflow-hidden bg-black ${scanning ? 'block' : 'hidden'}`}
        ></div>

        <form onSubmit={(e) => { e.preventDefault(); processScan(identifier); }} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">client email, phone, or pass serial</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. cds-xyz123 or client@email.com"
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
                <th className="pb-3 font-semibold">serial</th>
                <th className="pb-3 font-semibold">stamps</th>
                <th className="pb-3 font-semibold">total visits</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cards.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">{c.client_name}</td>
                  <td className="py-3 text-gray-600">{c.client_email}</td>
                  <td className="py-3 text-gray-600">{c.client_phone}</td>
                  <td className="py-3 font-mono text-gray-500">{c.pass_serial}</td>
                  <td className="py-3 font-bold text-[#693F00]">{c.stamps_count}/8</td>
                  <td className="py-3">{c.total_visits}</td>
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
    </main>
  );
}