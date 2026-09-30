'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Camera, PlusCircle } from 'lucide-react';

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
  const [scannedVoucher, setScannedVoucher] = useState<any>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [actionMessage, setActionMessage] = useState<any>(null);

  // New Voucher Form States
  const [purchaserName, setPurchaserName] = useState('');
  const [purchaserEmail, setPurchaserEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
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
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear().catch(() => {});
        } catch (e) {}
      }
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
          valueGbp: Number(valueGbp)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue voucher');

      setIssueSuccess(`Voucher successfully issued: ${data.voucherCode}`);
      setPurchaserName('');
      setPurchaserEmail('');
      setRecipientName('');
      setValueGbp('');
      loadVouchers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIssuing(false);
    }
  };

  // Triggered instantly when QR code is recognized by the camera
  const handleScanSuccess = async (decodedText: string) => {
    if (!decodedText || isProcessingRef.current) return;
    isProcessingRef.current = true;

    // 1. Instantly stop the camera feed safely before API call
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        // Suppress pattern matching DOM exceptions
      } finally {
        scannerRef.current = null;
      }
    }
    setScanning(false);

    // 2. Lookup voucher details to display remaining balance & prompt for amount
    await lookupVoucherCode(decodedText);
    isProcessingRef.current = false;
  };

  const lookupVoucherCode = async (code: string) => {
    if (!code) return;
    setLoading(true);
    setScannedVoucher(null);
    setActionMessage(null);
    setCodeQuery(code);

    try {
      const res = await fetch('/api/admin/vouchers/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voucher not found');

      setScannedVoucher(data.voucher);
      setPartialAmount(data.voucher.remaining_value_gbp.toString()); // default to full remaining balance
    } catch (err: any) {
      setActionMessage({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmRedemption = async () => {
    if (!scannedVoucher) return;
    setLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: scannedVoucher.code, 
          amount: Number(partialAmount) 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to redeem voucher');

      setActionMessage({
        success: true,
        redeemedAmount: data.redeemedAmount,
        remainingBalance: data.remainingBalance,
        recipientName: data.recipientName
      });
      setScannedVoucher(null);
      setCodeQuery('');
      setPartialAmount('');
      loadVouchers();
    } catch (err: any) {
      setActionMessage({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    await stopCamera();
    setScanning(true);
    setScannedVoucher(null);
    setActionMessage(null);
    isProcessingRef.current = false;

    setTimeout(async () => {
      const Html5Qrcode = (window as any).Html5Qrcode;
      if (!Html5Qrcode) {
        setScanning(false);
        setActionMessage({ error: 'Scanner library still loading. Please try again.' });
        return;
      }

      try {
        const container = document.getElementById('voucher-reader');
        if (container) container.innerHTML = '';

        scannerRef.current = new Html5Qrcode('voucher-reader');

        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText: string) => {
            handleScanSuccess(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        console.error('Camera start error:', err);
        setScanning(false);
        isProcessingRef.current = false;
        scannerRef.current = null;
        setActionMessage({ error: 'Unable to access camera. Please check permissions.' });
      }
    }, 200);
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        if (scanner.isScanning) {
          await scanner.stop();
        }
        await scanner.clear();
      } catch (e) {}
    }
    const container = document.getElementById('voucher-reader');
    if (container) container.innerHTML = '';
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
            <span>issue new monetary voucher</span>
          </h2>
          <p className="text-xs text-gray-500">generates customized monetary PDF voucher, emails purchaser, and logs into CRM.</p>

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
              <label className="block text-xs font-semibold mb-1">voucher monetary value (£)</label>
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
              type="button"
              onClick={scanning ? stopCamera : startCamera}
              className="px-3 py-1.5 bg-[#693F00] text-white text-xs uppercase rounded-full font-semibold"
            >
              {scanning ? 'stop camera' : 'open camera'}
            </button>
          </div>
          <p className="text-xs text-gray-500">open camera to scan QR code or enter code manually. balance will display to enter redemption amount.</p>

          <div id="voucher-reader" className={`w-full rounded-xl overflow-hidden bg-black ${scanning ? 'block' : 'hidden'}`}></div>

          <form onSubmit={(e) => { e.preventDefault(); lookupVoucherCode(codeQuery); }} className="space-y-3">
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
              {loading ? 'looking up voucher...' : 'lookup voucher code'}
            </button>
          </form>

          {/* Scanned / Looked Up Voucher Found: Prompt for Amount */}
          {scannedVoucher && (
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
              <div>
                <p className="font-bold text-sm text-[#693F00]">voucher recognized successfully!</p>
                <p className="text-xs">recipient: {scannedVoucher.recipient_name}</p>
                <p className="text-xs font-semibold">remaining balance: £{scannedVoucher.remaining_value_gbp}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">enter amount to redeem (£)</label>
                <input
                  type="number"
                  step="0.01"
                  max={scannedVoucher.remaining_value_gbp}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:border-[#693F00]"
                  required
                />
              </div>

              <button
                type="button"
                onClick={confirmRedemption}
                disabled={loading}
                className="w-full py-2.5 bg-emerald-700 text-white text-xs font-semibold uppercase tracking-widest rounded-full hover:bg-emerald-800 transition disabled:opacity-50"
              >
                {loading ? 'processing...' : `confirm deduction of £${partialAmount || 0}`}
              </button>
            </div>
          )}

          {/* Action Success / Error Feedback */}
          {actionMessage && (
            <div className={`p-3 rounded-xl text-xs font-medium ${actionMessage.error ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
              {actionMessage.error ? (
                <p>error: {actionMessage.error}</p>
              ) : (
                <div className="space-y-1">
                  <p className="font-bold">success: voucher redeemed!</p>
                  <p>recipient: {actionMessage.recipientName}</p>
                  <p>amount deducted: £{actionMessage.redeemedAmount}</p>
                  <p>remaining balance: £{actionMessage.remainingBalance}</p>
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