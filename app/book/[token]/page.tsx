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
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!token) return;

      const { data, error } = await supabase
        .from('custom_booking_links')
        .select('*, treatments(*)')
        .eq('token', token)
        .single();

      if (data) {
        setLinkData(data);
      }
      setLoading(false);
    }
    fetchData();
  }, [token]);

  const handleBookingConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedTime) {
      setErrorMessage('Please select a preferred time slot first.');
      return;
    }

    if (!clientEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!linkData?.target_date) {
      setErrorMessage('Invalid appointment date configured in link.');
      return;
    }

    try {
      const parsedDateObj = new Date(linkData.target_date);
      if (isNaN(parsedDateObj.getTime())) {
        setErrorMessage('Generated link contains an invalid date format.');
        return;
      }

      const year = parsedDateObj.getFullYear();
      const month = String(parsedDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDateObj.getDate()).padStart(2, '0');
      const dateStringOnly = `${year}-${month}-${day}`;

      let cleanTime = selectedTime.trim().toUpperCase();
      let hours = 0;
      let minutes = 0;

      if (cleanTime.includes('AM') || cleanTime.includes('PM')) {
        const [timePart, modifier] = cleanTime.split(' ');
        const parts = timePart.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1] || '0', 10);

        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
      } else {
        const parts = cleanTime.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1] || '0', 10);
      }

      const formattedHour = String(hours).padStart(2, '0');
      const formattedMinute = String(minutes).padStart(2, '0');
      const timeString24 = `${formattedHour}:${formattedMinute}:00`;

      const startDateTimeStr = `${dateStringOnly}T${timeString24}`;
      const startDate = new Date(startDateTimeStr);

      if (isNaN(startDate.getTime())) {
        setErrorMessage('Failed to construct valid start timestamp.');
        return;
      }

      const durationMinutes = linkData.bespoke_duration || linkData.treatments?.duration_minutes || 60;
      const finalPrice = linkData.final_price ?? linkData.bespoke_price ?? linkData.price_override ?? linkData.treatments?.price_gbp ?? 0;

      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
      
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      const endHour = String(endDate.getHours()).padStart(2, '0');
      const endMinute = String(endDate.getMinutes()).padStart(2, '0');
      const endString24 = `${endHour}:${endMinute}:00`;

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentId: linkData.treatment_id || null,
          clientName: linkData.client_name,
          clientEmail: clientEmail,
          clientPhone: clientPhone,
          startTime: `${startDateTimeStr}.000Z`,
          endTime: `${endYear}-${endMonth}-${endDay}T${endString24}.000Z`,
          durationMinutes: durationMinutes,
          priceOverride: finalPrice,
          overrideReason: linkData.bespoke_title ? `Bespoke Package: ${linkData.bespoke_title}` : 'Custom Link Booking',
          isAdminBypass: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to confirm booking.');
        return;
      }

      await supabase
        .from('custom_booking_links')
        .update({ is_used: true })
        .eq('token', token);

      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage('An unexpected error occurred: ' + (err.message || 'Check connection'));
    }
  };

  if (loading) return <div className="p-20 text-center text-stone-500">Loading your bespoke session details...</div>;
  if (!linkData || linkData.is_used === true) return <div className="p-20 text-center font-serif text-xl text-stone-800">This booking link has already been used or is invalid.</div>;

  const formattedDate = linkData?.target_date ? formatUKDate(linkData.target_date) : 'Scheduled Date';
  const treatmentTitle = linkData.bespoke_title || linkData.treatments?.title || 'Personalised Sanctuary Session';
  const treatmentDuration = linkData.bespoke_duration || linkData.treatments?.duration_minutes || 60;
  const treatmentPrice = linkData.final_price ?? linkData.bespoke_price ?? linkData.price_override ?? linkData.treatments?.price_gbp ?? 0;

  return (
    <main className="min-h-screen bg-stone-50 py-16 px-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
        <span className="text-xs uppercase tracking-widest text-[#693F00] font-semibold block text-center mb-1">Calm Drift Sanctuary</span>
        <h1 className="text-2xl font-serif text-stone-900 text-center mb-6">Confirm Your Appointment</h1>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg text-center">
            {errorMessage}
          </div>
        )}

        {!submitted ? (
          <form onSubmit={handleBookingConfirm} className="space-y-6">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-center space-y-1">
              <p className="text-xs text-stone-500 uppercase tracking-wider">Reserved For</p>
              <p className="font-semibold text-stone-900 text-lg">{linkData.client_name}</p>
              <p className="text-sm text-stone-700 font-medium">{treatmentTitle}</p>
              <p className="text-xs text-stone-500">{treatmentDuration} mins • £{treatmentPrice}</p>
              <p className="text-sm text-stone-600 pt-1 border-t border-stone-200 mt-2">{formattedDate}</p>
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
                        ? 'bg-[#693F00] text-white border-[#693F00] font-medium'
                        : 'border-stone-200 hover:border-stone-400 text-stone-700'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-2">Email Address</label>
              <input
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-[#693F00]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-600 mb-2">Phone Number</label>
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="07123 456789"
                className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-[#693F00]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#693F00] text-white text-xs uppercase tracking-widest rounded-full font-medium hover:bg-[#523100] transition"
            >
              Confirm Appointment
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 bg-amber-100 text-[#693F00] rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
            <h2 className="font-serif text-xl text-stone-900">Appointment Confirmed</h2>
            <p className="text-sm text-stone-600">We have sent a confirmation email with your consultation link and sanctuary details.</p>
          </div>
        )}
      </div>
    </main>
  );
}