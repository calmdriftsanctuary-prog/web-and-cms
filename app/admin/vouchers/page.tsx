'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Camera, CheckCircle, PlusCircle, Search } from 'lucide-react';

interface Voucher {
  id: string;
  code: string;
  recipient_name: string;
  recipient_email: string;
  initial_value_gbp: number;
  remaining_value_gbp: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [codeQuery, setCodeQuery] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);

  // New Voucher Form States
  const [purchaserName, setPurchaserName] = useState('');
  const [purchaserEmail, setPurchaserEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [treatmentTitle, setTreatmentTitle] = useState('');
  const [valueGbp, setValueGbp] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState('');

  // Camera Scanner States
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const isProcessingRef = useRef(false);

  const loadVouchers = async () => {
    try {
      const res = await fetch('/api/admin/vouchers/list');
      const data = await res.json();
      if (data.vouchers) setVouchers(data.vouchers);
    } catch (err) {
      console.error('Failed to load vouchers', err);
    }
  };

  useEffect(() => {
    loadVouchers();

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

  const handleIssueVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssuing(true);
    setIssueSuccess('');

    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaserName,
          purchaserEmail,
          recipientName,
          treatmentTitle,
          valueGbp: Number(valueGbp)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue voucher');

      setIssueSuccess(`Voucher successfully issued: ${data.voucherCode}`);
      setPurchaserName('');
      setPurchaserEmail('');
      setRecipientName('');
      setTreatmentTitle('');
      setValueGbp('');
      loadVouchers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIssuing(false);
    }
  };

  const processRedemption = async (code: string) => {
    if (!code || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setLoading(true);
    setScanResult(null);
    setCodeQuery(code);

    await stopCamera();

    try {
      const res = await fetch('/api/admin/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to redeem voucher');

      setScanResult(data);
      setCodeQuery('');
      loadVouchers();
    } catch (err: any) {
      setScanResult({ error: err.message });
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const startCamera = () => {
    setScanning(true);
    setScanResult(null);
    isProcessingRef.current = false;

    const checkLib = setInterval(() => {
      const Html5Qrcode = (window as any).Html5Qrcode;
      if (Html5Qrcode) {
        clearInterval(checkLib);

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode('voucher-reader');
        }

        scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText: string) => {
            if (decodedText && !isProcessingRef.current) {
              processRedemption(decodedText);
            }
          },
          () => {}
        ).catch((err: any) => {
          console.error('Camera start error:', err);
          setScanResult({ error: 'Unable to access camera.' });
          setScanning(false);
          isProcessingRef.current = false;
        });
      }
    }, 150);
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
      } finally {
        scannerRef.current = null;
      }
    }
    setScanning(false);
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans p-6 sm:p-10 max-w-5xl mx-auto space-y-8 lowercase">
      <header className="flex justify-between items-center border-b pb-4">
        <div className="space-y-1">
          <Link href="/admin" className="text-xs uppercase text-[#693F00] font-semibold">&larr; back to admin portal</Link>
          <h1 className="font-serif text-3xl">gift voucher management & scanner</h1>
        </div>
      </header>

      {/* Grid: Issue Voucher & Scanner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Issue Voucher Card */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="font-serif text-xl flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#693F00]" />
            <span>issue new voucher</span>
          </h2>
          <p className="text-xs text-gray-500">generates customized PDF voucher, emails purchaser, and logs into CRM.</p>

          {issueSuccess && <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">{issueSuccess}</div>}

          <form onSubmit={handleIssueVoucher} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1">purchaser name</label>
              <input
                type="text"
                required
                value={purchaserName}
                onChange={(e) => setPurchaserName(e.target.value)}
                placeholder="e.g. jack dawson"
                className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">purchaser email</label>
              <input
                type="email"
                required
                value={purchaserEmail}
                onChange={(e) => setPurchaserEmail(e.target.value)}
                placeholder="e.g. purchaser@email.com"
                className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">recipient name</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. charlotte dawson"
                className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">treatment title or description</label>
              <input
                type="text"
                required
                value={treatmentTitle}
                onChange={(e) => setTreatmentTitle(e.target.value)}
                placeholder="e.g. 60-minute holistic massage"
                className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">value (£)</label>
              <input
                type="number"
                required
                value={valueGbp}
                onChange={(e) => setValueGbp(e.target.value)}
                placeholder="e.g. 75"
                className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00]"
              />
            </div>
            <button
              type="submit"
              disabled={issuing}
              className="w-full py-3 bg-[#693F00] text-white text-xs font-semibold uppercase tracking-widest rounded-full hover:bg-[#523100] transition disabled:opacity-50"
            >
              {issuing ? 'generating & emailing voucher...' : 'generate & email voucher'}
            </button>
          </form>
        </div>

        {/* Scan & Redeem Card */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-serif text-xl flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#693F00]" />
              <span>scan & redeem voucher</span>
            </h2>
            <button
              onClick={scanning ? stopCamera : startCamera}
              className="px-3 py-1.5 bg-[#693F00] text-white text-xs uppercase rounded-full font-semibold"
            >
              {scanning ? 'stop camera' : 'open camera'}
            </button>
          </div>
          <p className="text-xs text-gray-500">scan voucher QR code or enter code manually to redeem.</p>

          <div id="voucher-reader" className={`w-full rounded-xl overflow-hidden bg-black ${scanning ? 'block' : 'hidden'}`}></div>

          <form onSubmit={(e) => { e.preventDefault(); processRedemption(codeQuery); }} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1">voucher reference code</label>
              <input
                type="text"
                value={codeQuery}
                onChange={(e) => setCodeQuery(e.target.value)}
                placeholder="e.g. CDS-VCH-A1B2C3"
                className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#693F00] text-white text-xs font-semibold uppercase tracking-widest rounded-full hover:bg-[#523100] transition disabled:opacity-50"
            >
              {loading ? 'processing redemption...' : 'redeem voucher'}
            </button>
          </form>

          {scanResult && (
            <div className={`p-3 rounded-xl text-xs font-medium ${scanResult.error ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
              {scanResult.error ? (
                <p>error: {scanResult.error}</p>
              ) : (
                <div className="space-y-1">
                  <p className="font-bold">success: voucher redeemed!</p>
                  <p>recipient: {scanResult.recipientName}</p>
                  <p>remaining balance: £{scanResult.remainingBalance}</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Active Vouchers Table */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border shadow-sm space-y-4">
        <h2 className="font-serif text-xl">active gift vouchers ({vouchers.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="pb-3 font-semibold">code</th>
                <th className="pb-3 font-semibold">recipient</th>
                <th className="pb-3 font-semibold">email</th>
                <th className="pb-3 font-semibold">initial value</th>
                <th className="pb-3 font-semibold">remaining balance</th>
                <th className="pb-3 font-semibold">status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="py-3 font-mono font-bold text-[#693F00]">{v.code}</td>
                  <td className="py-3 font-medium text-gray-900">{v.recipient_name}</td>
                  <td className="py-3 text-gray-600">{v.recipient_email}</td>
                  <td className="py-3">£{v.initial_value_gbp}</td>
                  <td className="py-3 font-bold">£{v.remaining_value_gbp}</td>
                  <td className="py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${v.is_active && v.remaining_value_gbp > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.is_active && v.remaining_value_gbp > 0 ? 'active' : 'redeemed'}
                    </span>
                  </td>
                </tr>
              ))}
              {vouchers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">no vouchers issued yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}