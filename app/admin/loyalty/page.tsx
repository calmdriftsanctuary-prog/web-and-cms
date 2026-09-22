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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

  const startCamera = async () => {
    setScanning(true);
    setResultMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestAnimationFrame(scanTick);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setResultMessage({ error: 'unable to access camera. please check permissions.' });
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setScanning(false);
  };

  const scanTick = async () => {
    if (!videoRef.current || !canvasRef.current || !mediaStreamRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          // Use native BarcodeDetector if available
          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes.length > 0) {
              const scannedValue = barcodes[0].rawValue;
              processScan(scannedValue);
              return;
            }
          }
        } catch (e) {
          // Fallback loop continuation
        }
      }
    }

    if (mediaStreamRef.current && scanning) {
      requestAnimationFrame(scanTick);
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
        <div className="flex justify-between items-center">
          <h2 className="font-serif text-xl">scan client pass</h2>
          <button
            onClick={scanning ? stopCamera : startCamera}
            className="px-4 py-2 bg-[#693F00] text-white text-xs uppercase rounded-full font-semibold flex items-center space-x-2"
          >
            <Camera className="w-4 h-4" />
            <span>{scanning ? 'stop camera scanner' : 'open camera scanner'}</span>
          </button>
        </div>
        <p className="text-xs text-gray-500">scan a client's pass QR code using the camera, or type their email, phone, or pass serial manually below.</p>

        {/* Hidden canvas for frame processing */}
        <canvas ref={canvasRef} className="hidden" />

        {scanning && (
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video max-w-md mx-auto flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 border-2 border-[#693F00]/50 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-dashed border-white/80 rounded-lg animate-pulse"></div>
            </div>
            <div className="absolute bottom-3 bg-black/70 text-white text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              align qr code inside box
            </div>
          </div>
        )}

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