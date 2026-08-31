'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LinkGenerator() {
  const [clientName, setClientName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [timesInput, setTimesInput] = useState('10:00 AM, 2:00 PM, 4:30 PM');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const timesArray = timesInput.split(',').map((t) => t.trim());

    const { error } = await supabase.from('custom_booking_links').insert([
      {
        token,
        client_name: clientName,
        target_date: targetDate,
        available_times: timesArray,
      },
    ]);

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
    <div className="max-w-xl mx-auto p-8 bg-white rounded-2xl border border-stone-200 shadow-sm mt-6">
      <h2 className="text-2xl font-serif text-stone-900 mb-2">Generate Personalised Booking Link</h2>
      <p className="text-sm text-stone-500 mb-6">Create a custom link for a client after they message you on Instagram or Facebook.</p>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1">Client Name</label>
          <input
            type="text"
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Sarah Jenkins"
            className="w-full p-3 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1">Requested Date</label>
          <input
            type="date"
            required
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full p-3 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1">Available Times (comma-separated)</label>
          <input
            type="text"
            required
            value={timesInput}
            onChange={(e) => setTimesInput(e.target.value)}
            placeholder="10:00 AM, 1:30 PM, 3:00 PM"
            className="w-full p-3 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition"
        >
          Generate Link
        </button>
      </form>

      {generatedLink && (
        <div className="mt-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Custom Link Ready to Send:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={generatedLink}
              className="w-full p-2 bg-white rounded border border-stone-300 text-xs text-stone-700"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-stone-900 text-white text-xs rounded hover:bg-stone-800 transition shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}