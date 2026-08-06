'use client';

import { useState } from 'react';
import { Star, Sparkles } from 'lucide-react';

export default function ReviewPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: name, clientEmail: email, rating, comment }),
    });

    setLoading(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      alert('Failed to submit review.');
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#6B8E70]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sanctuary Experience</span>
          </span>
          <h1 className="font-serif text-2xl">Leave a Review</h1>
          <p className="text-xs text-gray-500">We value your feedback and strive to make every session restorative.</p>
        </div>

        {submitted ? (
          <div className="p-6 bg-emerald-50 text-emerald-800 text-center rounded-2xl space-y-2">
            <h3 className="font-serif font-bold">Thank You!</h3>
            <p className="text-xs">Your review has been successfully published to our sanctuary homepage.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-semibold mb-1">Your First Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-xl text-sm" placeholder="e.g. Sarah" />
            </div>
            <div>
              <label className="block text-xs uppercase font-semibold mb-1">Email (Optional)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-xl text-sm" placeholder="sarah@example.com" />
            </div>
            <div>
              <label className="block text-xs uppercase font-semibold mb-1">Star Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button type="button" key={num} onClick={() => setRating(num)} className={`p-2 rounded-lg border ${rating >= num ? 'bg-amber-100 text-amber-600 border-amber-300' : 'bg-gray-50 text-gray-300'}`}>
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase font-semibold mb-1">Your Review</label>
              <textarea rows={4} required value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-3 border rounded-xl text-sm" placeholder="Describe your experience..." />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#6B8E70] text-white text-xs font-semibold uppercase tracking-widest rounded-xl hover:bg-[#5B7B60] transition">
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}