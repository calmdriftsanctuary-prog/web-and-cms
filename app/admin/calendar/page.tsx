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
  marketing_opt_in?: boolean;
  marketing_opt_in_at?: string;
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
  marketingOptIn: boolean;
  marketingOptInAt?: string;
  totalSpend: number;
  bookingsCount: number;
}

interface FieldConfig {
  id: string;
  form_type: string;
  field_name: string;
  field_label: string;
  is_required: boolean;
  is_active: boolean;
}

interface CustomField {
  id: string;
  form_type: string;
  field_label: string;
  field_type: string;
  options: string;
  is_required: boolean;
}

export default function AdminCalendarPage() {
  const [activeNavTab, setActiveNavTab] = useState<'calendar' | 'forms' | 'crm'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);

  // CRM selected client detail state
  const [selectedClientEmail, setSelectedClientEmail] = useState<string | null>(null);

  // Form Builder state
  const [formTypeTab, setFormTypeTab] = useState<'booking' | 'consultation'>('booking');
  const [editingDefaultField, setEditingDefaultField] = useState<FieldConfig | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Form state for blocking time
  const [blockStartTime, setBlockStartTime] = useState('09:00');
  const [blockEndTime, setBlockEndTime] = useState('10:00');
  const [blockReason, setBlockReason] = useState('Lunch / Personal');

  // Selected Booking for Actions/Editing Panel
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Modal state for manual booking
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingClientEmail, setSelectedExistingClientEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMarketingOptIn, setNewMarketingOptIn] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

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

        if (adminData.fieldConfigs) setFieldConfigs(adminData.fieldConfigs);
        if (adminData.customFields) setCustomFields(adminData.customFields);

        // Aggregate unique clients with marketing opt-in tracking
        const clientMap = new Map<string, ClientRecord>();
        fetchedBookings.forEach((b: Booking) => {
          if (b.client_email) {
            const emailKey = b.client_email.toLowerCase();
            const existing = clientMap.get(emailKey);
            const spend = b.status !== 'cancelled' ? (b.treatments?.price_gbp || 0) : 0;

            if (existing) {
              existing.totalSpend += spend;
              existing.bookingsCount += 1;
              if (b.marketing_opt_in) {
                existing.marketingOptIn = true;
                existing.marketingOptInAt = b.marketing_opt_in_at || existing.marketingOptInAt;
              }
            } else {
              clientMap.set(emailKey, {
                name: b.client_name,
                email: b.client_email,
                phone: b.client_phone || '',
                marketingOptIn: !!b.marketing_opt_in,
                marketingOptInAt: b.marketing_opt_in_at,
                totalSpend: spend,
                bookingsCount: 1,
              });
            }
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
    if (res.ok) fetchData();
    else alert('Failed to remove block');
  };

  const handleSendConsultationEmail = async (clientEmail: string, clientName: string) => {
    if (!confirm(`Send consultation intake form request email to ${clientName} (${clientEmail})?`)) return;
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'send_consultation_email', email: clientEmail, name: clientName }),
    });
    if (res.ok) alert('Consultation form email sent successfully!');
    else alert('Failed to send consultation email.');
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
    let finalOptIn = false;

    if (clientMode === 'existing') {
      const found = clients.find(c => c.email.toLowerCase() === selectedExistingClientEmail.toLowerCase());
      if (!found) {
        alert('Please select an existing client.');
        return;
      }
      finalName = found.name;
      finalEmail = found.email;
      finalPhone = found.phone;
      finalOptIn = found.marketingOptIn;
    } else {
      if (!newName || !newEmail) {
        alert('Name and Email are required for a new client.');
        return;
      }
      finalName = newName;
      finalEmail = newEmail;
      finalPhone = newPhone;
      finalOptIn = newMarketingOptIn;
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
          marketingOptIn: finalOptIn,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create booking');

      // Send alert email to calmdriftsanctuary@gmail.com
      await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin_booking_notification',
          admin_email: 'calmdriftsanctuary@gmail.com',
          client_name: finalName,
          treatment_title: treatment?.title,
          start_time: selectedSlot,
        }),
      }).catch(() => {});

      alert('Manual booking successfully created! Notification sent to calmdriftsanctuary@gmail.com.');
      setIsBookingModalOpen(false);
      setBookingNotes('');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewMarketingOptIn(false);
      fetchData();
    } catch (err: any) {
      alert(`Booking error: ${err.message}`);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleSaveDefaultField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDefaultField) return;
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'field_config', ...editingDefaultField }),
    });
    if (res.ok) {
      alert('Field configuration updated successfully!');
      setEditingDefaultField(null);
      fetchData();
    } else {
      alert('Failed to update field configuration');
    }
  };

  const handleAddCustomFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel) return;
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'custom_field',
        form_type: formTypeTab,
        field_label: newFieldLabel,
        field_type: newFieldType,
        options: newFieldOptions,
        is_required: newFieldRequired,
      }),
    });
    if (res.ok) {
      alert('Custom field successfully added!');
      setNewFieldLabel('');
      setNewFieldOptions('');
      setNewFieldRequired(false);
      fetchData();
    } else {
      alert('Failed to add custom field');
    }
  };

  const handleDeleteCustomField = async (id: string) => {
    if (!confirm('Delete this custom field?')) return;
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delete_custom_field', id }),
    });
    if (res.ok) fetchData();
    else alert('Failed to delete custom field');
  };

  const dayBookings = bookings.filter(b => b.start_time.startsWith(selectedDate) && b.status !== 'cancelled');
  const dayBlocks = blockedTimes.filter(bt => bt.start_time.startsWith(selectedDate));
  const filteredDefaultFields = fieldConfigs.filter(fc => fc.form_type === formTypeTab);
  const filteredCustomFields = customFields.filter(cf => cf.form_type === formTypeTab);
  const selectedClientDetails = selectedClientEmail ? clients.find(c => c.email.toLowerCase() === selectedClientEmail.toLowerCase()) : null;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans p-3 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Navigation */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B8E70]">Sanctuary Operating Hub</span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C332B]">Practitioner Admin</h1>
            </div>
            
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="w-full sm:w-auto bg-[#6B8E70] text-white px-4 py-2.5 rounded-xl font-medium hover:bg-[#5B7B60] transition shadow-sm text-xs uppercase tracking-wider"
            >
              + Manual Booking
            </button>
          </div>

          <div className="flex overflow-x-auto pb-1 space-x-2 border-t pt-3">
            <button
              onClick={() => setActiveNavTab('calendar')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition ${
                activeNavTab === 'calendar' ? 'bg-[#6B8E70] text-white' : 'bg-gray-100 text-[#2C332B] hover:bg-gray-200'
              }`}
            >
              Calendar & Schedule
            </button>
            <button
              onClick={() => setActiveNavTab('crm')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition ${
                activeNavTab === 'crm' ? 'bg-[#6B8E70] text-white' : 'bg-gray-100 text-[#2C332B] hover:bg-gray-200'
              }`}
            >
              CRM & Marketing Opt-Ins
            </button>
            <button
              onClick={() => setActiveNavTab('forms')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition ${
                activeNavTab === 'forms' ? 'bg-[#6B8E70] text-white' : 'bg-gray-100 text-[#2C332B] hover:bg-gray-200'
              }`}
            >
              Form Builder & Fields
            </button>
          </div>
        </div>

        {/* Tab 1: Calendar */}
        {activeNavTab === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
                <button
                  onClick={() => handleDayChange(-1)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold transition"
                >
                  &larr; Prev Day
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border p-2 rounded-xl text-sm font-medium bg-transparent cursor-pointer"
                />
                <button
                  onClick={() => handleDayChange(1)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold transition"
                >
                  Next Day &rarr;
                </button>
              </div>
              <span className="text-xs text-gray-500 font-medium">Viewing Schedule for {selectedDate}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Appointments & Time Blocks</h2>

                {loading ? (
                  <p className="text-xs text-gray-500 py-6">Loading schedule...</p>
                ) : dayBookings.length === 0 && dayBlocks.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-8 text-center">No active appointments or time blocks for this date.</p>
                ) : (
                  <div className="space-y-3">
                    {dayBookings.map((b) => {
                      const startTime = new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const endTime = new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const isSelected = selectedBooking?.id === b.id;

                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBooking(b)}
                          className={`p-4 rounded-xl cursor-pointer transition border-l-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${
                            isSelected ? 'bg-[#F2F6F3] border-[#6B8E70] shadow-sm' : 'bg-[#FAF9F6] border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B8E70] bg-[#E2ECE3] px-2 py-0.5 rounded">
                                {startTime} - {endTime}
                              </span>
                              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                {b.status || 'Confirmed'}
                              </span>
                            </div>
                            <h3 className="font-serif text-lg font-bold text-[#2C332B] mt-1">{b.treatments?.title || 'Treatment'}</h3>
                            <p className="text-xs text-gray-600">Client: {b.client_name} ({b.client_phone || b.client_email})</p>
                          </div>
                          <span className="text-xs text-[#6B8E70] font-semibold self-end sm:self-center">Manage &rarr;</span>
                        </div>
                      );
                    })}

                    {dayBlocks.map((bt) => {
                      const startTime = new Date(bt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const endTime = new Date(bt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={bt.id} className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-xl flex justify-between items-center">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                              Blocked ({startTime} - {endTime})
                            </span>
                            <h3 className="font-serif text-lg font-bold text-gray-900 mt-1">{bt.reason}</h3>
                          </div>
                          <button
                            onClick={() => handleRemoveBlock(bt.id)}
                            className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded-lg transition font-medium"
                          >
                            Unblock
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {selectedBooking ? (
                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border space-y-4">
                    <div className="flex justify-between items-start border-b pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#6B8E70] bg-[#E2ECE3] px-2 py-0.5 rounded">Selected Appointment</span>
                        <h3 className="font-serif text-xl font-bold text-[#2C332B] mt-1">{selectedBooking.client_name}</h3>
                      </div>
                      <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-black font-bold text-lg">&times;</button>
                    </div>

                    <div className="text-xs space-y-2 text-gray-600">
                      <p><strong>Treatment:</strong> {selectedBooking.treatments?.title} ({selectedBooking.treatments?.duration_minutes} mins)</p>
                      <p><strong>Email:</strong> {selectedBooking.client_email}</p>
                      <p><strong>Phone:</strong> {selectedBooking.client_phone || 'N/A'}</p>
                      <p><strong>Time:</strong> {new Date(selectedBooking.start_time).toLocaleString()}</p>
                      <p><strong>Marketing Opt-In:</strong> {selectedBooking.marketing_opt_in ? `Yes (${selectedBooking.marketing_opt_in_at ? new Date(selectedBooking.marketing_opt_in_at).toLocaleString() : 'Date recorded'})` : 'No'}</p>
                      {selectedBooking.notes && <p className="italic bg-gray-50 p-2.5 rounded-xl"><strong>Notes:</strong> {selectedBooking.notes}</p>}
                    </div>

                    <div className="pt-3 border-t space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700">Consultation Form Status</h4>
                      {selectedBooking.consultations && selectedBooking.consultations.length > 0 ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs text-gray-700">
                          <p className="text-emerald-800 font-bold">✓ Form Completed</p>
                          <p><strong>Medical:</strong> {selectedBooking.consultations[0].medical_conditions || 'None'}</p>
                          <p><strong>Allergies:</strong> {selectedBooking.consultations[0].allergies || 'None'}</p>
                          <p><strong>Pressure:</strong> {selectedBooking.consultations[0].pressure_preference || 'Standard'}</p>
                          <p><strong>Emergency:</strong> {selectedBooking.consultations[0].emergency_contact || 'None'}</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                          <p className="text-amber-800 italic">No consultation form completed yet.</p>
                          <button
                            onClick={() => handleSendConsultationEmail(selectedBooking.client_email, selectedBooking.client_name)}
                            className="w-full py-2 bg-[#6B8E70] text-white rounded-lg text-[10px] uppercase font-semibold hover:bg-[#5B7B60] transition"
                          >
                            Trigger Form Email
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border space-y-4">
                    <h2 className="font-serif text-xl font-bold text-[#2C332B]">Block Out Time</h2>
                    <form onSubmit={handleBlockTime} className="space-y-3 text-xs">
                      <div>
                        <label className="block uppercase mb-1 text-gray-600 font-semibold">Start Time</label>
                        <input type="time" value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} className="w-full border p-2.5 rounded-xl" required />
                      </div>
                      <div>
                        <label className="block uppercase mb-1 text-gray-600 font-semibold">End Time</label>
                        <input type="time" value={blockEndTime} onChange={(e) => setBlockEndTime(e.target.value)} className="w-full border p-2.5 rounded-xl" required />
                      </div>
                      <div>
                        <label className="block uppercase mb-1 text-gray-600 font-semibold">Reason</label>
                        <input type="text" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="e.g. Lunch, Personal" className="w-full border p-2.5 rounded-xl" required />
                      </div>
                      <button type="submit" className="w-full bg-[#2C332B] text-white py-3 rounded-xl uppercase font-semibold tracking-wider hover:bg-black transition">
                        Block Time Slot
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: CRM & Marketing Opt-Ins */}
        {activeNavTab === 'crm' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`${selectedClientEmail ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white p-5 sm:p-6 rounded-2xl shadow-sm border space-y-4`}>
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#2C332B]">Client Database & Marketing Opt-Ins</h2>
                <p className="text-xs text-gray-500 mt-0.5">Overview of all sanctuary clients, their total spend, and email marketing consent statuses.</p>
              </div>

              {clients.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-8 text-center">No client records found.</p>
              ) : (
                <div className="grid gap-3">
                  {clients.map((c) => (
                    <div
                      key={c.email}
                      onClick={() => setSelectedClientEmail(c.email)}
                      className={`p-4 rounded-xl border cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition ${
                        selectedClientEmail === c.email ? 'bg-[#F2F6F3] border-[#6B8E70]' : 'bg-[#FAF9F6] border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-serif text-lg font-bold text-[#2C332B]">{c.name}</h3>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            c.marketingOptIn ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {c.marketingOptIn ? 'Opted In' : 'Not Opted In'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{c.email} • {c.phone || 'No phone'} • £{c.totalSpend} total spend</p>
                      </div>
                      <span className="text-xs text-[#6B8E70] font-semibold">View History &rarr;</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedClientDetails && (
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border space-y-4 h-fit">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#6B8E70] bg-[#E2ECE3] px-2 py-0.5 rounded">Client Record</span>
                    <h3 className="font-serif text-xl font-bold text-[#2C332B] mt-1">{selectedClientDetails.name}</h3>
                  </div>
                  <button onClick={() => setSelectedClientEmail(null)} className="text-gray-400 hover:text-black font-bold text-lg">&times;</button>
                </div>

                <div className="text-xs space-y-2 text-gray-600">
                  <p><strong>Email:</strong> {selectedClientDetails.email}</p>
                  <p><strong>Phone:</strong> {selectedClientDetails.phone || 'N/A'}</p>
                  <p><strong>Total Bookings:</strong> {selectedClientDetails.bookingsCount}</p>
                  <p><strong>Total Spend:</strong> £{selectedClientDetails.totalSpend}</p>
                </div>

                <div className="pt-3 border-t space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700">Marketing Consent Status</h4>
                  <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                    selectedClientDetails.marketingOptIn ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}>
                    <p className="font-bold">{selectedClientDetails.marketingOptIn ? '✓ Opted In for Marketing' : '✕ No Marketing Consent'}</p>
                    {selectedClientDetails.marketingOptInAt && (
                      <p className="text-[11px] opacity-80">Opted in on: {new Date(selectedClientDetails.marketingOptInAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Form Builder */}
        {activeNavTab === 'forms' && (
          <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#2C332B]">Dynamic Form Builder</h2>
              <p className="text-xs text-gray-500 mt-1">Edit labels and requirements for existing default fields, or add brand-new custom fields.</p>
            </div>

            <div className="flex space-x-2 border-b pb-4">
              <button
                onClick={() => setFormTypeTab('booking')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                  formTypeTab === 'booking' ? 'bg-[#6B8E70] text-white' : 'bg-gray-100 text-[#2C332B] hover:bg-gray-200'
                }`}
              >
                Booking Form Fields
              </button>
              <button
                onClick={() => setFormTypeTab('consultation')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                  formTypeTab === 'consultation' ? 'bg-[#6B8E70] text-white' : 'bg-gray-100 text-[#2C332B] hover:bg-gray-200'
                }`}
              >
                Consultation Form Fields
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Edit Existing Default Fields</h3>
              <div className="grid gap-3">
                {filteredDefaultFields.map((fc) => (
                  <div key={fc.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-xl bg-[#FAF9F6] gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#2C332B]">{fc.field_label} <span className="text-xs text-[#6B8E70]">({fc.field_name})</span></p>
                      <p className="text-xs text-gray-500">{fc.is_required ? 'Required' : 'Optional'} • {fc.is_active ? 'Active' : 'Hidden'}</p>
                    </div>
                    <button
                      onClick={() => setEditingDefaultField(fc)}
                      className="px-3 py-1.5 bg-white border text-xs uppercase font-semibold rounded-lg hover:bg-gray-50 transition"
                    >
                      Edit Field
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddCustomFieldSubmit} className="p-5 bg-[#FAF9F6] border rounded-2xl space-y-4 pt-4 mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2C332B]">Add New Custom Field ({formTypeTab})</h3>
              <div>
                <label className="block text-xs uppercase mb-1 font-medium text-gray-700">Field Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Do you have any specific injuries?"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  className="w-full p-3 bg-white border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase mb-1 font-medium text-gray-700">Field Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full p-3 bg-white border rounded-xl text-sm"
                >
                  <option value="text">Text Input (Short)</option>
                  <option value="textarea">Textarea (Long)</option>
                  <option value="select">Dropdown Selection</option>
                  <option value="checkbox">Checkbox (True/False)</option>
                </select>
              </div>
              {newFieldType === 'select' && (
                <div>
                  <label className="block text-xs uppercase mb-1 font-medium text-gray-700">Dropdown Options</label>
                  <input
                    type="text"
                    required
                    placeholder="Comma separated (e.g. Option A, Option B)"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    className="w-full p-3 bg-white border rounded-xl text-sm"
                  />
                </div>
              )}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="newReq"
                  checked={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.target.checked)}
                  className="h-4 w-4 text-[#6B8E70]"
                />
                <label htmlFor="newReq" className="text-xs font-medium text-gray-700 cursor-pointer">Make this field required</label>
              </div>
              <button type="submit" className="w-full py-3 bg-[#6B8E70] text-white text-xs uppercase font-semibold tracking-widest rounded-xl hover:bg-[#5B7B60] transition">
                Add Custom Field
              </button>
            </form>

            {filteredCustomFields.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Custom Fields</h3>
                <div className="grid gap-3">
                  {filteredCustomFields.map((cf) => (
                    <div key={cf.id} className="flex justify-between items-center p-4 border rounded-xl bg-white">
                      <div>
                        <p className="text-sm font-medium text-[#2C332B]">{cf.field_label} <span className="text-xs text-gray-500">({cf.field_type})</span></p>
                        <p className="text-xs text-gray-500">{cf.is_required ? 'Required' : 'Optional'}</p>
                      </div>
                      <button onClick={() => handleDeleteCustomField(cf.id)} className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition">Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Default Field Modal */}
        {editingDefaultField && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl">
              <h3 className="font-serif text-xl font-bold">Edit Field: {editingDefaultField.field_name}</h3>
              <form onSubmit={handleSaveDefaultField} className="space-y-3 text-xs">
                <div>
                  <label className="block uppercase mb-1 font-semibold text-gray-600">Field Label</label>
                  <input
                    type="text"
                    required
                    value={editingDefaultField.field_label}
                    onChange={(e) => setEditingDefaultField({ ...editingDefaultField, field_label: e.target.value })}
                    className="w-full p-3 border rounded-xl text-sm"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="editReq"
                    checked={editingDefaultField.is_required}
                    onChange={(e) => setEditingDefaultField({ ...editingDefaultField, is_required: e.target.checked })}
                    className="h-4 w-4 text-[#6B8E70]"
                  />
                  <label htmlFor="editReq" className="text-xs font-medium text-gray-700 cursor-pointer">Required Field</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="editActive"
                    checked={editingDefaultField.is_active}
                    onChange={(e) => setEditingDefaultField({ ...editingDefaultField, is_active: e.target.checked })}
                    className="h-4 w-4 text-[#6B8E70]"
                  />
                  <label htmlFor="editActive" className="text-xs font-medium text-gray-700 cursor-pointer">Active (Visible on Form)</label>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setEditingDefaultField(null)} className="w-1/2 py-3 border rounded-xl uppercase font-semibold">Cancel</button>
                  <button type="submit" className="w-1/2 py-3 bg-[#6B8E70] text-white rounded-xl uppercase font-semibold hover:bg-[#5B7B60]">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manual Booking Modal */}
        {isBookingModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-serif text-xl font-bold text-gray-900">Create Manual Booking</h3>
                <button onClick={() => setIsBookingModalOpen(false)} className="text-gray-400 hover:text-black font-bold text-lg">&times;</button>
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
                      <option key={t.id} value={t.id}>{t.title} ({t.duration_minutes} mins - £{t.price_gbp})</option>
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
                    <p className="text-red-500 text-xs italic">No available slots for this date/duration.</p>
                  ) : (
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="w-full border p-2.5 rounded-xl bg-white font-mono"
                      required
                    >
                      {availableSlots.map((slot) => {
                        const timeString = new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return <option key={slot} value={slot}>{timeString}</option>;
                      })}
                    </select>
                  )}
                </div>

                <div className="pt-2 border-t">
                  <label className="block font-medium text-gray-700 mb-1">Client Information</label>
                  <div className="flex space-x-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setClientMode('existing')}
                      className={`flex-1 py-2 text-xs font-semibold uppercase rounded-lg border transition ${clientMode === 'existing' ? 'bg-[#6B8E70] text-white border-[#6B8E70]' : 'bg-gray-50 text-gray-700'}`}
                    >
                      Existing Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientMode('new')}
                      className={`flex-1 py-2 text-xs font-semibold uppercase rounded-lg border transition ${clientMode === 'new' ? 'bg-[#6B8E70] text-white border-[#6B8E70]' : 'bg-gray-50 text-gray-700'}`}
                    >
                      New Client
                    </button>
                  </div>

                  {clientMode === 'existing' ? (
                    <div>
                      {clients.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No existing CRM clients found.</p>
                      ) : (
                        <select
                          value={selectedExistingClientEmail}
                          onChange={(e) => setSelectedExistingClientEmail(e.target.value)}
                          className="w-full border p-2.5 rounded-xl bg-white"
                          required
                        >
                          <option value="">-- Choose client --</option>
                          {clients.map((c) => (
                            <option key={c.email} value={c.email}>{c.name} ({c.email})</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input type="text" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border p-2.5 rounded-xl" required={clientMode === 'new'} />
                      <input type="email" placeholder="Email Address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full border p-2.5 rounded-xl" required={clientMode === 'new'} />
                      <input type="tel" placeholder="Phone Number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full border p-2.5 rounded-xl" />
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="checkbox"
                          id="manualOptIn"
                          checked={newMarketingOptIn}
                          onChange={(e) => setNewMarketingOptIn(e.target.checked)}
                          className="h-4 w-4 text-[#6B8E70]"
                        />
                        <label htmlFor="manualOptIn" className="text-xs font-medium text-gray-700 cursor-pointer">Opted in to marketing emails</label>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea rows={2} value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} placeholder="Notes..." className="w-full border p-2.5 rounded-xl" />
                </div>

                <div className="flex space-x-3 pt-4 border-t">
                  <button type="button" onClick={() => setIsBookingModalOpen(false)} className="w-1/2 py-2.5 border rounded-xl text-xs uppercase font-semibold">Cancel</button>
                  <button type="submit" disabled={isSubmittingBooking || availableSlots.length === 0} className="w-1/2 py-2.5 bg-[#6B8E70] text-white rounded-xl text-xs uppercase font-semibold hover:bg-[#5B7B60] transition disabled:opacity-50">
                    {isSubmittingBooking ? 'Booking...' : 'Confirm & Notify'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}