'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ExistingClient {
  key: string;
  name: string;
  email: string;
  phone: string;
}

const TIME_SLOTS = Array.from({ length: 45 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 15; // Starts at 08:00 (480 mins)
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const minuteStr = m === 0 ? '00' : m.toString();
  
  return `${hour12}:${minuteStr} ${ampm}`;
});

function isAwaitingCompletion(val?: string | null): boolean {
  return (val || '').trim().toLowerCase() === 'awaiting completion';
}

function buildUniqueClients(
  rows: Array<{ client_name?: string | null; client_email?: string | null; client_phone?: string | null }>
): ExistingClient[] {
  const byEmail = new Map<string, ExistingClient>();
  const byNameOnly = new Map<string, ExistingClient>();

  for (const row of rows) {
    const rawName = (row.client_name || '').trim();
    const rawEmail = (row.client_email || '').trim();
    const rawPhone = (row.client_phone || '').trim();

    if (!rawName || isAwaitingCompletion(rawName)) continue;

    const cleanEmail = isAwaitingCompletion(rawEmail) ? '' : rawEmail;
    const cleanPhone = isAwaitingCompletion(rawPhone) ? '' : rawPhone;
    const emailKey = cleanEmail.toLowerCase();
    const nameKey = rawName.toLowerCase();

    if (emailKey) {
      const existing = byEmail.get(emailKey);
      if (existing) {
        if (!existing.phone && cleanPhone) existing.phone = cleanPhone;
        if (!existing.name && rawName) existing.name = rawName;
      } else {
        const entry: ExistingClient = {
          key: `email:${emailKey}`,
          name: rawName,
          email: cleanEmail,
          phone: cleanPhone,
        };
        byEmail.set(emailKey, entry);
      }
    } else {
      const existing = byNameOnly.get(nameKey);
      if (existing) {
        if (!existing.phone && cleanPhone) existing.phone = cleanPhone;
      } else {
        byNameOnly.set(nameKey, {
          key: `name:${nameKey}`,
          name: rawName,
          email: '',
          phone: cleanPhone,
        });
      }
    }
  }

  // If a name-only entry matches the name of an entry that has an email, merge its phone onto the email entry
  for (const [nameKey, nameEntry] of byNameOnly.entries()) {
    const emailMatch = Array.from(byEmail.values()).find(
      (c) => c.name.trim().toLowerCase() === nameKey
    );
    if (emailMatch) {
      if (!emailMatch.phone && nameEntry.phone) emailMatch.phone = nameEntry.phone;
      byNameOnly.delete(nameKey);
    }
  }

  return [...Array.from(byEmail.values()), ...Array.from(byNameOnly.values())].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export default function LinkGenerator() {
  const [clientName, setClientName] = useState('');
  const [existingClients, setExistingClients] = useState<ExistingClient[]>([]);
  const [selectedExistingClient, setSelectedExistingClient] = useState<ExistingClient | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const clientFieldRef = useRef<HTMLDivElement>(null);

  const [targetDate, setTargetDate] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  
  // Treatments & Bespoke Package State
  const [treatments, setTreatments] = useState<any[]>([]);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [isBespoke, setIsBespoke] = useState(false);
  const [bespokeTitle, setBespokeTitle] = useState('');
  const [bespokeDuration, setBespokeDuration] = useState('60');
  const [bespokePrice, setBespokePrice] = useState('');

  // Discount State
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState('');

  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchInitialData() {
      const { data: treatmentData } = await supabase
        .from('treatments')
        .select('*')
        .order('price_gbp', { ascending: true });

      if (treatmentData) {
        setTreatments(treatmentData);
        if (treatmentData.length > 0) setSelectedTreatmentId(treatmentData[0].id);
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('client_name, client_email, client_phone');

      if (!bookingError && bookingData && bookingData.length > 0) {
        setExistingClients(buildUniqueClients(bookingData));
        return;
      }

      try {
        const res = await fetch('/api/admin/bookings?bookings=true');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.bookings)) {
            setExistingClients(buildUniqueClients(json.bookings));
          }
        }
      } catch {
        // Ignore fallback fetch errors
      }
    }

    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientFieldRef.current && !clientFieldRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = existingClients.filter((client) => {
    const q = clientName.trim().toLowerCase();
    if (!q) return true;
    return (
      client.name.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q) ||
      client.phone.toLowerCase().includes(q)
    );
  });

  const handleClientNameChange = (val: string) => {
    setClientName(val);
    setShowSuggestions(true);
    if (
      selectedExistingClient &&
      val.trim().toLowerCase() !== selectedExistingClient.name.toLowerCase()
    ) {
      setSelectedExistingClient(null);
    }
  };

  const handleSelectSuggestion = (client: ExistingClient) => {
    setClientName(client.name);
    setSelectedExistingClient(client);
    setShowSuggestions(false);
  };

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  // Format helper for friendly date display (e.g. "Friday, 30 October 2026")
  const getFormattedDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate final price after discount
  const getBasePrice = () => {
    if (isBespoke) return parseFloat(bespokePrice) || 0;
    const tr = treatments.find(t => t.id === selectedTreatmentId);
    return tr ? tr.price_gbp : 0;
  };

  const calculateFinalPrice = () => {
    const base = getBasePrice();
    const val = parseFloat(discountValue) || 0;
    if (val <= 0) return base;
    if (discountType === 'percentage') {
      return Math.max(0, base - (base * (val / 100)));
    }
    return Math.max(0, base - val);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTimes.length === 0) {
      alert('Please select at least one time slot.');
      return;
    }

    setLoading(true);
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const basePrice = getBasePrice();
    const finalPrice = calculateFinalPrice();
    const discountApplied = basePrice - finalPrice;

    const matchedClient =
      selectedExistingClient ||
      existingClients.find((c) => c.name.toLowerCase() === clientName.trim().toLowerCase());

    const payload: any = {
      token,
      client_name: clientName.trim(),
      target_date: targetDate,
      available_times: selectedTimes,
      final_price: finalPrice,
      discount_amount: discountApplied > 0 ? discountApplied : 0,
      is_used: false,
    };

    if (matchedClient) {
      if (matchedClient.email) payload.client_email = matchedClient.email;
      if (matchedClient.phone) payload.client_phone = matchedClient.phone;
    }

    if (isBespoke) {
      payload.bespoke_title = bespokeTitle || 'Bespoke Package';
      payload.bespoke_duration = parseInt(bespokeDuration) || 60;
      payload.bespoke_price = finalPrice;
    } else {
      payload.treatment_id = selectedTreatmentId;
      payload.price_override = finalPrice;
    }

    const { error } = await supabase.from('custom_booking_links').insert([payload]);

    setLoading(false);

    if (error) {
      alert('Error generating link: ' + error.message);
      return;
    }

    const link = `${window.location.origin}/book/${token}`;
    setGeneratedLink(link);
    setCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-8 bg-white rounded-2xl border border-stone-200 shadow-sm mt-6">
      <h2 className="text-2xl font-serif text-stone-900 mb-2">Generate Personalised Booking Link</h2>
      <p className="text-sm text-stone-500 mb-6">Create a custom link for a client with bespoke treatments or discounts.</p>

      <form onSubmit={handleGenerate} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div ref={clientFieldRef} className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600">Client Name</label>
              <span className="text-[11px] text-stone-400">{existingClients.length} in CRM</span>
            </div>
            <input
              type="text"
              required
              autoComplete="off"
              value={clientName}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => handleClientNameChange(e.target.value)}
              placeholder="Type a new name or search CRM..."
              className="w-full p-3 rounded-xl border border-stone-300 text-sm focus:outline-none focus:border-stone-900"
            />
            {showSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-30">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <button
                      key={client.key}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(client);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-stone-50 flex items-center justify-between gap-2 border-b last:border-b-0 border-stone-100 cursor-pointer"
                    >
                      <span className="text-sm font-medium text-stone-900 truncate">{client.name}</span>
                      {client.email && (
                        <span className="text-xs text-stone-400 truncate">{client.email}</span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3.5 py-2.5 text-xs text-stone-500">
                    No matching CRM client — will create a new record on booking.
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600">Requested Date</label>
              {targetDate && (
                <span className="text-[11px] font-medium text-[#693F00] capitalize">
                  {getFormattedDateLabel(targetDate)}
                </span>
              )}
            </div>
            <input
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-300 text-sm focus:outline-none focus:border-stone-900"
            />
          </div>
        </div>

        {/* Treatment / Bespoke Section */}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium uppercase tracking-wider text-stone-700">Treatment Selection</label>
            <button
              type="button"
              onClick={() => setIsBespoke(!isBespoke)}
              className="text-xs text-[#693F00] font-semibold hover:underline"
            >
              {isBespoke ? 'Switch to Standard Treatment' : '+ Create Bespoke Package'}
            </button>
          </div>

          {!isBespoke ? (
            <div>
              <select
                value={selectedTreatmentId}
                onChange={(e) => setSelectedTreatmentId(e.target.value)}
                className="w-full p-3 rounded-xl border border-stone-300 text-sm bg-white focus:outline-none focus:border-stone-900"
              >
                {treatments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.duration_minutes} mins - £{t.price_gbp})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <input
                  type="text"
                  placeholder="Bespoke Package Title"
                  value={bespokeTitle}
                  onChange={(e) => setBespokeTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-300 text-sm bg-white"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Duration (mins)"
                  value={bespokeDuration}
                  onChange={(e) => setBespokeDuration(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-300 text-sm bg-white"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Price (£)"
                  value={bespokePrice}
                  onChange={(e) => setBespokePrice(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-300 text-sm bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Discount Integration Section */}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
          <label className="block text-xs font-medium uppercase tracking-wider text-stone-700">Apply Discount (Optional)</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percentage')}
                className="w-full p-3 rounded-xl border border-stone-300 text-sm bg-white"
              >
                <option value="fixed">Fixed Amount (£)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
            <div>
              <input
                type="number"
                placeholder={discountType === 'fixed' ? 'e.g. 15 (£)' : 'e.g. 10 (%)'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full p-3 rounded-xl border border-stone-300 text-sm bg-white"
              />
            </div>
            <div className="flex items-center justify-end px-2">
              <span className="text-sm font-semibold text-stone-900">
                Final Price: £{calculateFinalPrice().toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-2">Available Times (Select Multiple)</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 bg-stone-50 border rounded-xl">
            {TIME_SLOTS.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => toggleTime(time)}
                className={`py-2 px-1 text-xs rounded-lg border transition ${
                  selectedTimes.includes(time)
                    ? 'bg-[#693F00] border-[#693F00] text-white font-medium'
                    : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#693F00] text-white uppercase tracking-widest text-xs font-semibold rounded-full hover:bg-[#523100] transition disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Custom Link'}
        </button>
      </form>

      {generatedLink && (
        <div className="mt-8 p-4 bg-[#FAF9F6] rounded-xl border border-stone-200">
          <p className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">Custom Link Ready to Send:</p>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              readOnly
              value={generatedLink}
              className="w-full p-3 bg-white rounded-lg border border-stone-300 text-sm text-stone-800 focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="w-full sm:w-auto px-6 py-3 bg-stone-900 text-white text-xs uppercase tracking-widest font-semibold rounded-lg hover:bg-stone-800 transition shrink-0"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
