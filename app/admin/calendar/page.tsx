'use client';

import { useState, useEffect } from 'react';

interface Consultation {
  id: string;
  medical_conditions: string;
  allergies: string;
  pressure_preference: string;
  emergency_contact: string;
  created_at: string;
}

interface Booking {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  treatment_id?: string;
  treatments?: { id: string; title: string; duration_minutes: number; price_gbp: number };
  consultations?: Consultation[];
}

interface BlockedTime {
  id: string;
  start_time: string;
  end_time: string;
  reason: string;
}

interface Treatment {
  id: string;
  title: string;
  duration_minutes: number;
  price_gbp: number;
}

interface ClientRecord {
  name: string;
  email: string;
  phone: string;
}

export default function AdminCalendarPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state for blocking time
  const [blockStartTime, setBlockStartTime] = useState('09:00');
  const [blockEndTime, setBlockEndTime] = useState('10:00');
  const [blockReason, setBlockReason] = useState('Lunch / Personal');

  // Selected Booking for Actions/Editing Panel
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editTreatmentId, setEditTreatmentId] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [isOverride, setIsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Modal state for manual booking
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [selectedClientEmail, setSelectedClientEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Helper to change dates via arrows
  const handleDayChange = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const blockedRes = await fetch(`/api/admin/blocked-times`).catch(() => null);
      if (blockedRes && blockedRes.ok) {
        const blockedData = await blockedRes.json();
        setBlockedTimes(blockedData.blockedTimes || []);
      }

      // Updated to fetch from /api/admin/bookings?bookings=true (same as Schedule tab)
      const adminRes = await fetch(`/api/admin/bookings?bookings=true`).catch(() => null);
      if (adminRes && adminRes.ok) {
        const adminData = await adminRes.json();
        const fetchedBookings = adminData.bookings || [];
        setBookings(fetchedBookings);

        if (selectedBooking) {
          const updated = fetchedBookings.find((b: Booking) => b.id === selectedBooking.id);
          if (updated) setSelectedBooking(updated);
        }

        if (adminData.treatments) {
          setTreatments(adminData.treatments);
          if (adminData.treatments.length > 0 && !selectedTreatmentId) {
            setSelectedTreatmentId(adminData.treatments[0].id);
          }
        }

        const clientMap = new Map<string, ClientRecord>();
        fetchedBookings.forEach((b: Booking) => {
          if (b.client_email) {
            clientMap.set(b.client_email.toLowerCase(), {
              name: b.client_name,
              email: b.client_email,
              phone: b.client_phone || '',
            });
          }
        });
        setClients(Array.from(clientMap.values()));
      }
    } catch (err) {
      console.error('Failed to load schedule data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    if (isBookingModalOpen && selectedTreatmentId && selectedDate) {
      const treatment = treatments.find(t => t.id === selectedTreatmentId);
      const duration = treatment ? treatment.duration_minutes : 60;

      fetch(`/api/availability?date=${selectedDate}&duration=${duration}`)
        .then(res => res.json())
        .then(data => {
          setAvailableSlots(data.slots || []);
          if (data.slots && data.slots.length > 0) {
            setSelectedSlot(data.slots[0]);
          } else {
            setSelectedSlot('');
          }
        })
        .catch(err => console.error('Failed to fetch availability slots', err));
    }
  }, [isBookingModalOpen, selectedTreatmentId, selectedDate, treatments]);

  useEffect(() => {
    if (isEditing && editTreatmentId) {
      const t = treatments.find(tr => tr.id === editTreatmentId);
      if (t && !isOverride) {
        setEditPrice(t.price_gbp);
      }
    }
  }, [editTreatmentId, isEditing, isOverride, treatments]);

  const handleBlockTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const startIso = `${selectedDate}T${blockStartTime}:00.000Z`;
    const endIso = `${selectedDate}T${blockEndTime}:00.000Z`;

    const res = await fetch('/api/admin/blocked-times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startTime: startIso, endTime: endIso, reason: blockReason }),
    });

    if (res.ok) {
      alert('Time successfully blocked!');
      setBlockReason('Lunch / Personal');
      fetchData();
    } else {
      alert('Failed to block time');
    }
  };

  const handleRemoveBlock = async (id: string) => {
    if (!confirm('Are you sure you want to remove this block?')) return;
    const res = await fetch(`/api/admin/blocked-times?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
    } else {
      alert('Failed to remove block');
    }
  };

  const handleSendConsultationEmail = async (clientEmail: string, clientName: string) => {
    if (!confirm(`Send consultation intake form request email to ${clientName} (${clientEmail})?`)) return;
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'send_consultation_email', email: clientEmail, name: clientName }),
    });
    if (res.ok) {
      alert('Consultation form email sent successfully!');
    } else {
      alert('Failed to send consultation email.');
    }
  };

  const handleManualBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedTreatmentId) {
      alert('Please select a valid treatment and time slot.');
      return;
    }

    let finalName = '';
    let finalEmail = '';
    let finalPhone = '';

    if (clientMode === 'existing') {
      const found = clients.find(c => c.email.toLowerCase() === selectedClientEmail.toLowerCase());
      if (!found) {
        alert('Please select an existing client.');
        return;
      }
      finalName = found.name;
      finalEmail = found.email;
      finalPhone = found.phone;
    } else {
      if (!newName || !newEmail) {
        alert('Name and Email are required for a new client.');
        return;
      }
      finalName = newName;
      finalEmail = newEmail;
      finalPhone = newPhone;
    }

    const treatment = treatments.find(t => t.id === selectedTreatmentId);
    const duration = treatment ? treatment.duration_minutes : 60;

    setIsSubmittingBooking(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentId: selectedTreatmentId,
          clientName: finalName,
          clientEmail: finalEmail,
          clientPhone: finalPhone,
          startTime: selectedSlot,
          durationMinutes: duration,
          notes: bookingNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create booking');

      alert('Manual booking successfully created! Confirmation & consultation emails triggered.');
      setIsBookingModalOpen(false);
      setBookingNotes('');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      fetchData();
    } catch (err: any) {
      alert(`Booking error: ${err.message}`);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment and notify the client?')) return;
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'update_booking_status', id, status: 'cancelled', trigger_email: 'cancellation' }),
    });

    if (res.ok) {
      alert('Appointment cancelled and notification email sent.');
      setSelectedBooking(null);
      fetchData();
    } else {
      alert('Failed to cancel appointment');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !editDate || !editTime || !editTreatmentId) return;

    const startDateTime = new Date(`${editDate}T${editTime}`);
    const treatment = treatments.find(t => t.id === editTreatmentId);
    const duration = treatment ? treatment.duration_minutes : 60;
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    let updatedNotes = selectedBooking.notes || '';
    if (isOverride && overrideReason) {
      const overrideTag = `[Price Override: £${editPrice} - Reason: ${overrideReason}]`;
      updatedNotes = updatedNotes ? `${updatedNotes} | ${overrideTag}` : overrideTag;
    }

    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'update_booking_details',
        id: selectedBooking.id,
        treatment_id: editTreatmentId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        notes: updatedNotes,
        trigger_email: 'reschedule',
      }),
    });

    if (res.ok) {
      alert('Appointment successfully updated!');
      setIsEditing(false);
      setIsOverride(false);
      setOverrideReason('');
      fetchData();
    } else {
      alert('Failed to update appointment');
    }
  };

  const dayBookings = bookings.filter(b => b.start_time.startsWith(selectedDate) && b.status !== 'cancelled');
  const dayBlocks = blockedTimes.filter(bt => bt.start_time.startsWith(selectedDate));

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">CMS Schedule & Calendar</h1>
          <p className="text-gray-600 text-sm mt-1">Manage appointments, manual bookings, and time blocks.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/admin"
            className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition inline-flex items-center gap-2 border shadow-sm text-sm"
          >
            &larr; Back to Admin
          </a>
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition shadow-sm text-sm"
          >
            + New Manual Booking
          </button>
          <div className="flex items-center gap-1 bg-white border p-1 rounded-lg shadow-sm">
            <button
              onClick={() => handleDayChange(-1)}
              className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded font-bold transition text-sm"
              title="Previous Day"
            >
              &larr;
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 p-1 text-sm font-medium bg-transparent focus:ring-0 cursor-pointer"
            />
            <button
              onClick={() => handleDayChange(1)}
              className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded font-bold transition text-sm"
              title="Next Day"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left 2 Cols: Day Schedule View */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-md border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">
              Schedule for {selectedDate}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDayChange(-1)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-semibold text-gray-700 transition"
              >
                &larr; Prev Day
              </button>
              <button
                onClick={() => handleDayChange(1)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-semibold text-gray-700 transition"
              >
                Next Day &rarr;
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading schedule...</p>
          ) : dayBookings.length === 0 && dayBlocks.length === 0 ? (
            <p className="text-gray-500 italic py-8 text-center">
              No active appointments or blocked times for this date.
            </p>
          ) : (
            <div className="space-y-4">
              {dayBookings.map((b) => {
                const startTime = new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isSelected = selectedBooking?.id === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedBooking(b);
                      setIsEditing(false);
                    }}
                    className={`p-4 rounded-lg cursor-pointer transition border-l-4 flex justify-between items-center ${
                      isSelected
                        ? 'bg-emerald-100 border-emerald-600 shadow-sm'
                        : 'bg-emerald-50 border-emerald-500 hover:bg-emerald-100/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded">
                          {startTime} - {endTime}
                        </span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                          {b.status || 'Confirmed'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mt-1">{b.treatments?.title || 'Treatment'}</h3>
                      <p className="text-sm text-gray-600">Client: {b.client_name} ({b.client_phone || b.client_email})</p>
                    </div>
                    <span className="text-xs text-emerald-700 font-semibold">Manage &rarr;</span>
                  </div>
                );
              })}

              {dayBlocks.map((bt) => {
                const startTime = new Date(bt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(bt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={bt.id} className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-200 px-2 py-0.5 rounded">
                        Blocked Time ({startTime} - {endTime})
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 mt-1">{bt.reason}</h3>
                    </div>
                    <button
                      onClick={() => handleRemoveBlock(bt.id)}
                      className="text-sm bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded transition"
                    >
                      Unblock
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Appointment Actions or Block Time Form */}
        <div className="space-y-6">
          {selectedBooking ? (
            <div className="bg-white p-6 rounded-xl shadow-md border space-y-4">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Selected Appointment
                  </span>
                  <h3 className="font-serif text-xl font-bold text-gray-900 mt-1">{selectedBooking.client_name}</h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedBooking(null);
                    setIsEditing(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="text-sm space-y-2 text-gray-600">
                <p><strong>Treatment:</strong> {selectedBooking.treatments?.title} ({selectedBooking.treatments?.duration_minutes} mins)</p>
                <p><strong>Email:</strong> {selectedBooking.client_email}</p>
                <p><strong>Phone:</strong> {selectedBooking.client_phone || 'N/A'}</p>
                <p><strong>Time:</strong> {new Date(selectedBooking.start_time).toLocaleString()}</p>
                {selectedBooking.notes && <p className="italic bg-gray-50 p-2 rounded text-xs"><strong>Notes:</strong> {selectedBooking.notes}</p>}
              </div>

              {/* Consultation Form Info Integration */}
              <div className="pt-3 border-t space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700">Consultation Form Status</h4>
                {selectedBooking.consultations && selectedBooking.consultations.length > 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1.5 text-xs text-gray-700">
                    <p className="text-emerald-800 font-bold">✓ Form Completed</p>
                    <p><strong>Medical:</strong> {selectedBooking.consultations[0].medical_conditions || 'None'}</p>
                    <p><strong>Allergies:</strong> {selectedBooking.consultations[0].allergies || 'None'}</p>
                    <p><strong>Pressure Pref:</strong> {selectedBooking.consultations[0].pressure_preference || 'Standard'}</p>
                    <p><strong>Emergency:</strong> {selectedBooking.consultations[0].emergency_contact || 'None'}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-xs">
                    <p className="text-amber-800 italic">No consultation form completed yet.</p>
                    <button
                      onClick={() => handleSendConsultationEmail(selectedBooking.client_email, selectedBooking.client_name)}
                      className="w-full py-1.5 bg-emerald-600 text-white rounded text-[10px] uppercase font-semibold hover:bg-emerald-700 transition"
                    >
                      Trigger Form Email
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleEditSubmit} className="space-y-3 pt-3 border-t text-sm">
                  <h4 className="font-semibold text-gray-800">Edit Appointment</h4>
                  
                  <div>
                    <label className="block text-xs uppercase mb-1">Treatment Type</label>
                    <select
                      value={editTreatmentId}
                      onChange={(e) => setEditTreatmentId(e.target.value)}
                      className="w-full border p-2 rounded-lg bg-white"
                      required
                    >
                      {treatments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.duration_minutes} mins - £{t.price_gbp})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs uppercase mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full border p-2 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase mb-1">Time</label>
                      <input
                        type="time"
                        required
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="w-full border p-2 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs uppercase">Price (£)</label>
                      <label className="flex items-center space-x-1 text-xs text-emerald-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isOverride}
                          onChange={(e) => setIsOverride(e.target.checked)}
                          className="rounded"
                        />
                        <span>Manual Override</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!isOverride}
                      value={editPrice}
                      onChange={(e) => setEditPrice(parseFloat(e.target.value))}
                      className={`w-full border p-2 rounded-lg ${!isOverride ? 'bg-gray-100 text-gray-500' : 'bg-white'}`}
                      required
                    />
                  </div>

                  {isOverride && (
                    <div>
                      <label className="block text-xs uppercase mb-1 text-red-600 font-semibold">Override Reason (Required)</label>
                      <input
                        type="text"
                        required={isOverride}
                        placeholder="e.g. Discount applied, VIP client adjustment"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="w-full border p-2 rounded-lg border-red-300 bg-red-50/50"
                      />
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="w-1/2 py-2 border rounded-lg text-xs uppercase font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-2 bg-emerald-600 text-white rounded-lg text-xs uppercase font-medium hover:bg-emerald-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 pt-3 border-t">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditDate(selectedDate);
                      setEditTime(new Date(selectedBooking.start_time).toTimeString().slice(0, 5));
                      setEditTreatmentId(selectedBooking.treatment_id || selectedBooking.treatments?.id || '');
                      setEditPrice(selectedBooking.treatments?.price_gbp || 0);
                      setIsOverride(false);
                      setOverrideReason('');
                    }}
                    className="w-full py-2 bg-gray-50 border text-xs uppercase font-semibold rounded-lg hover:bg-gray-100 transition"
                  >
                    Edit Appointment & Pricing
                  </button>
                  <button
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                    className="w-full py-2 bg-red-50 border border-red-200 text-red-600 text-xs uppercase font-semibold rounded-lg hover:bg-red-100 transition"
                  >
                    Cancel Appointment
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-md border h-fit">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Block Out Time</h2>
              <form onSubmit={handleBlockTime} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    className="w-full border p-2 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    className="w-full border p-2 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="e.g. Lunch break, Personal"
                    className="w-full border p-2 rounded-lg text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800 transition text-sm"
                >
                  Block Time Slot
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Manual Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-serif text-xl font-bold text-gray-900">Create Manual Booking</h3>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleManualBookingSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Select Treatment</label>
                <select
                  value={selectedTreatmentId}
                  onChange={(e) => setSelectedTreatmentId(e.target.value)}
                  className="w-full border p-2.5 rounded-xl bg-white"
                  required
                >
                  {treatments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.duration_minutes} mins - £{t.price_gbp})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Booking Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border p-2.5 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Available Slot</label>
                {availableSlots.length === 0 ? (
                  <p className="text-red-500 text-xs italic">No available slots for this date/duration. Try another date or check existing blocks.</p>
                ) : (
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="w-full border p-2.5 rounded-xl bg-white font-mono"
                    required
                  >
                    {availableSlots.map((slot) => {
                      const timeString = new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <option key={slot} value={slot}>
                          {timeString}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Client Mode Switcher */}
              <div className="pt-2 border-t">
                <label className="block font-medium text-gray-700 mb-1">Client Information</label>
                <div className="flex space-x-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setClientMode('existing')}
                    className={`flex-1 py-2 text-xs font-semibold uppercase rounded-lg border transition ${clientMode === 'existing' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700'}`}
                  >
                    Select Existing Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientMode('new')}
                    className={`flex-1 py-2 text-xs font-semibold uppercase rounded-lg border transition ${clientMode === 'new' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700'}`}
                  >
                    Add New Client
                  </button>
                </div>

                {clientMode === 'existing' ? (
                  <div>
                    {clients.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No existing CRM clients found. Please add a new client.</p>
                    ) : (
                      <select
                        value={selectedClientEmail}
                        onChange={(e) => setSelectedClientEmail(e.target.value)}
                        className="w-full border p-2.5 rounded-xl bg-white"
                        required
                      >
                        <option value="">-- Choose client from CRM --</option>
                        {clients.map((c) => (
                          <option key={c.email} value={c.email}>
                            {c.name} ({c.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full border p-2.5 rounded-xl"
                      required={clientMode === 'new'}
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full border p-2.5 rounded-xl"
                      required={clientMode === 'new'}
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full border p-2.5 rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Any special requests or practitioner notes..."
                  className="w-full border p-2.5 rounded-xl"
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="w-1/2 py-2.5 border rounded-xl text-xs uppercase font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking || availableSlots.length === 0}
                  className="w-1/2 py-2.5 bg-emerald-600 text-white rounded-xl text-xs uppercase font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {isSubmittingBooking ? 'Booking...' : 'Confirm & Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}