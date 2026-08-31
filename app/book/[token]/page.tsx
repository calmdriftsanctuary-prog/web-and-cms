'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { formatUKDate } from '@/lib/formatDate';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CustomBookingPage() {
  const { token } = useParams();
  const [linkData, setLinkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTime, setSelectedTime] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchLink() {
      if (!token) return;
      const { data } = await supabase
        .from('custom_booking_links')
        .select('*')
        .eq('token', token)
        .single();

      if (data) {
        setLinkData(data);
      }
      setLoading(false);
    }
    fetchLink();
  }, [token]);

  const handleBookingConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) return;

    const appointmentDateTime = `${linkData.target_date}T${selectedTime}:00`;

    const { error } = await supabase.from('bookings').insert([
      {
        client_name: linkData.client_name,
        client_email: clientEmail,
        client_phone: clientPhone,
        appointment_date: appointmentDateTime,
        consultation_sent: false,
        review_sent: false,
      },
    ]);

    if (error) {
      alert('Error confirming booking: ' + error.message);
      return;
    }

    await supabase
      .from('custom_booking_links')
      .update({ is_used: true })
      .eq('token', token);

    setSubmitted(true);
  };

  if (loading) return <div className="p-20 text-center text-stone-500">Loading your bespoke session details...</div>;
  if (!linkData || linkData.is_used) return <div className="p-20 text-center font-serif text-xl text-stone-800">This booking link has already been used or is invalid.</div>;

  const formattedDate = formatUKDate(linkData.target_date);

  return (
    <main className="min-h-screen bg-stone-50 py-16 px-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
        <span className="text-xs uppercase tracking-widest text-stone-500 font-medium block text-center mb-1">Calm Drift Sanctuary</span>
        <h1 className="text-2xl font-serif text-stone-900 text-center mb-6">Confirm Your Appointment</h1>

        {!submitted ? (
          <form onSubmit={handleBookingConfirm} className="space-y-6">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Reserved For</p>
              <p className="font-medium text-stone-900 text-lg">{linkData.client_name}</p>
              <p className="text-sm text-stone-600 mt-1">{formattedDate}</p>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-2">Select Your Preferred Time</label>
              <div className="grid grid-cols-2 gap-2">
                {linkData.available_times.map((time: string) => (
                  <button
                    type="button"
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-3 text-sm rounded-lg border transition ${
                      selectedTime === time
                        ? 'bg-stone-900 text-white border-stone-900 font-medium'
                        : 'border-stone-200 hover:border-stone-400 text-stone-700'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-3 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="07123 456789"
                className="w-full p-3 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedTime}
              className={`w-full py-3 rounded-lg font-medium transition ${
                selectedTime ? 'bg-stone-900 text-white hover:bg-stone-800' : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              Confirm Appointment
            </button>
          </form>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">✓</div>
            <h2 className="text-xl font-serif text-stone-900 mb-2">You're All Booked In</h2>
            <p className="text-sm text-stone-600 mb-6">We have reserved your slot for {formattedDate} at {selectedTime}. We look forward to welcoming you.</p>
          </div>
        )}
      </div>
    </main>
  );
}