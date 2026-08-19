'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronLeft, ChevronRight, XCircle, Send, Plus, RefreshCw, Trash2 } from 'lucide-react';
import AvailabilityManager from './AvailabilityManager';

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
  price_override?: number;
  override_reason?: string;
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

export default function AdminCalendarPage() {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('day');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Edit appointment state
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editTreatmentId, setEditTreatmentId] = useState('');
  const [editPriceOverride, setEditPriceOverride] = useState('');
  const [editOverrideReason, setEditOverrideReason] = useState('');

  // Selected Blocked Time for Editing/Deleting
  const [selectedBlockTime, setSelectedBlockTime] = useState<BlockedTime | null>(null);
  const [editBlockDate, setEditBlockDate] = useState('');
  const [editBlockStart, setEditBlockStart] = useState('');
  const [editBlockEnd, setEditBlockEnd] = useState('');
  const [editBlockReason, setEditBlockReason] = useState('');

  // Manual Booking Modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [bookingDateStr, setBookingDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingClientEmail, setSelectedExistingClientEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMarketingOptIn, setNewMarketingOptIn] = useState(false);
  
  // Unrestricted manual time input for admin
  const [manualTime, setManualTime] = useState('10:00');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetch('/api/admin/bookings?bookings=true')
      .then((res) => res.json())
      .then((data) => {
        const fetchedBookings = (data.bookings || []).map((b: any) => {
          const hasOptInExplicit = b.marketing_opt_in === true || b.marketing_opt_in === 1 || b.marketing_opt_in === 'true';
          const hasOptInNote = typeof b.notes === 'string' && b.notes.toLowerCase().includes('marketing opt-in: yes');
          return {
            ...b,
            marketing_opt_in: hasOptInExplicit || hasOptInNote,
          };
        });
        setBookings(fetchedBookings);
        if (data.treatments) {
          setTreatments(data.treatments);
          if (data.treatments.length > 0 && !selectedTreatmentId) {
            setSelectedTreatmentId(data.treatments[0].id);
          }
        }

        const clientMap = new Map<string, ClientRecord>();
        fetchedBookings.forEach((b: Booking) => {
          if (b.client_email) {
            const emailKey = b.client_email.toLowerCase();
            const existing = clientMap.get(emailKey);
            const spend = b.status !== 'cancelled' ? (b.price_override ?? b.treatments?.price_gbp ?? 0) : 0;

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
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load calendar data:', err);
        setLoading(false);
      });

    fetch('/api/admin/blocked-times')
      .then((res) => res.json())
      .then((data) => {
        if (data.blockedTimes) setBlockedTimes(data.blockedTimes);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedBooking && selectedBooking.start_time) {
      const start = new Date(selectedBooking.start_time);
      if (!isNaN(start.getTime())) {
        const year = start.getFullYear();
        const month = String(start.getMonth() + 1).padStart(2, '0');
        const day = String(start.getDate()).padStart(2, '0');
        const hours = String(start.getHours()).padStart(2, '0');
        const minutes = String(start.getMinutes()).padStart(2, '0');

        setEditDate(`${year}-${month}-${day}`);
        setEditTime(`${hours}:${minutes}`);
      }
      setEditTreatmentId(selectedBooking.treatment_id || selectedBooking.treatments?.id || '');
      setEditPriceOverride(selectedBooking.price_override !== undefined && selectedBooking.price_override !== null ? String(selectedBooking.price_override) : '');
      setEditOverrideReason(selectedBooking.override_reason || '');
    }
  }, [selectedBooking]);

  useEffect(() => {
    if (selectedBlockTime) {
      const start = new Date(selectedBlockTime.start_time);
      const end = new Date(selectedBlockTime.end_time);
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, '0');
      const day = String(start.getDate()).padStart(2, '0');

      setEditBlockDate(`${year}-${month}-${day}`);
      setEditBlockStart(start.toTimeString().slice(0, 5));
      setEditBlockEnd(end.toTimeString().slice(0, 5));
      setEditBlockReason(selectedBlockTime.reason);
    }
  }, [selectedBlockTime]);

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    let day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1; // Monday start
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getWeekDays = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  };

  const handleUpdateBlockedTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlockTime) return;

    const startIso = new Date(`${editBlockDate}T${editBlockStart}:00`).toISOString();
    const endIso = new Date(`${editBlockDate}T${editBlockEnd}:00`).toISOString();

    const res = await fetch('/api/admin/blocked-times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedBlockTime.id, startTime: startIso, endTime: endIso, reason: editBlockReason }),
    });

    if (res.ok) {
      alert('Blocked time updated successfully!');
      setSelectedBlockTime(null);
      loadData();
    } else {
      alert('Failed to update blocked time.');
    }
  };

  const handleRemoveBlock = async (id: string) => {
    if (!confirm('Remove this time block?')) return;
    const res = await fetch(`/api/admin/blocked-times?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSelectedBlockTime(null);
      loadData();
    }
  };

  const handleSendConsultationEmail = async (clientEmail: string, clientName: string) => {
    if (!confirm(`Send consultation intake form request email to ${clientName} (${clientEmail})?`)) return;
    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'send_consultation_email', email: clientEmail, name: clientName }),
    });
    alert('Consultation form email sent successfully!');
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'update_booking_status', id, status: 'cancelled', trigger_email: 'cancellation' }),
    });
    setSelectedBooking(null);
    setIsEditingBooking(false);
    loadData();
  };

  const handleSaveEditedBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !editDate || !editTime || !editTreatmentId) return;

    const startDateTime = new Date(`${editDate}T${editTime}:00`);
    const treatment = treatments.find(t => t.id === editTreatmentId);
    const duration = treatment ? treatment.duration_minutes : 60;
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'update_booking_full',
        id: selectedBooking.id,
        treatment_id: editTreatmentId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        price_override: editPriceOverride ? parseFloat(editPriceOverride) : null,
        override_reason: editPriceOverride ? editOverrideReason : null,
      }),
    });

    if (res.ok) {
      alert('Appointment updated successfully!');
      setIsEditingBooking(false);
      setSelectedBooking(null);
      loadData();
    } else {
      alert('Failed to update appointment.');
    }
  };

  const handleManualBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTime || !selectedTreatmentId) {
      alert('Please select a valid treatment and time.');
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
    const startDateTime = new Date(`${bookingDateStr}T${manualTime}:00`);

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
          startTime: startDateTime.toISOString(),
          durationMinutes: duration,
          notes: bookingNotes,
          marketingOptIn: finalOptIn,
          isAdminBypass: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create booking');

      alert('Manual booking successfully created!');
      setIsBookingModalOpen(false);
      setBookingNotes('');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewMarketingOptIn(false);
      loadData();
    } catch (err: any) {
      alert(`Booking error: ${err.message}`);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans p-4 sm:p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header with Back to Admin Button */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#E5E7EB] pb-6 gap-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-full text-xs font-semibold uppercase tracking-wider text-[#2C332B] hover:bg-gray-50 transition shadow-sm">
              &larr; Back to Admin Portal
            </Link>
            <div>
              <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#6B8E70]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sanctuary Schedule</span>
              </span>
              <h1 className="font-serif text-3xl md:text-4xl text-[#2C332B] mt-1">Practitioner Calendar</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="px-4 py-2 bg-[#6B8E70] text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#5B7B60] transition shadow-sm flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> <span>Manual Booking</span>
            </button>
            <div className="flex items-center bg-white p-1 rounded-full border border-[#E5E7EB] shadow-sm">
              <button onClick={() => setViewMode('month')} className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${viewMode === 'month' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Month
              </button>
              <button onClick={() => setViewMode('week')} className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${viewMode === 'week' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Week
              </button>
              <button onClick={() => setViewMode('day')} className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${viewMode === 'day' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Day
              </button>
            </div>
          </div>
        </header>

        {/* Availability Manager Widget */}
        <AvailabilityManager />

        {/* Calendar Navigation Bar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center space-x-3">
            <button onClick={handlePrev} className="p-2 border rounded-xl hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="font-serif text-xl text-[#2C332B]">
              {viewMode === 'month' && `${monthNames[month]} ${year}`}
              {viewMode === 'week' && `Week of ${getWeekDays(currentDate)[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${getWeekDays(currentDate)[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              {viewMode === 'day' && currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={handleNext} className="p-2 border rounded-xl hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-[#FAF9F6] border rounded-xl text-xs uppercase font-semibold">Today</button>
        </div>

        {/* Main Calendar View Area (Full Width) */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm min-h-[550px]">
          {loading ? (
            <p className="text-xs text-gray-400 py-12 text-center">Loading schedule...</p>
          ) : viewMode === 'month' ? (
            <div>
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-36 bg-[#FAF9F6]/40 rounded-xl border border-transparent"></div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayBookings = bookings.filter(b => b.start_time.startsWith(dateStr) && b.status !== 'cancelled');
                  const dayBlocks = blockedTimes.filter(bt => bt.start_time.startsWith(dateStr));
                  const isToday = new Date().toISOString().startsWith(dateStr);

                  return (
                    <div key={dayNum} className={`h-36 p-2 rounded-xl border flex flex-col justify-between overflow-y-auto ${isToday ? 'border-[#6B8E70] bg-[#FAF9F6]' : 'border-[#E5E7EB] bg-white'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold ${isToday ? 'bg-[#6B8E70] text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-[#2C332B]'}`}>{dayNum}</span>
                        {(dayBookings.length > 0 || dayBlocks.length > 0) && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 rounded font-semibold">{dayBookings.length + dayBlocks.length}</span>
                        )}
                      </div>
                      <div className="space-y-1 mt-1">
                        {dayBookings.map(b => (
                          <div 
                            key={b.id} 
                            onClick={() => { setSelectedBlockTime(null); setSelectedBooking(b); }} 
                            className={`text-[10px] p-1 rounded truncate cursor-pointer transition ${selectedBooking?.id === b.id ? 'bg-[#6B8E70] text-white' : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'}`}
                          >
                            {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {b.client_name}
                          </div>
                        ))}
                        {dayBlocks.map(bt => {
                          const startTime = new Date(bt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const endTime = new Date(bt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div 
                              key={bt.id} 
                              onClick={() => { setSelectedBooking(null); setSelectedBlockTime(bt); }}
                              className={`text-[10px] p-1 rounded bg-amber-50 text-amber-900 border border-amber-200 cursor-pointer hover:bg-amber-100 transition ${selectedBlockTime?.id === bt.id ? 'ring-2 ring-amber-600' : ''}`}
                            >
                              <p className="font-bold">{startTime} - {endTime}</p>
                              <p className="truncate italic">{bt.reason}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'week' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wider text-[#6B7280] border-b pb-2">
                {getWeekDays(currentDate).map((day, idx) => (
                  <div key={idx}>
                    <p>{day.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                    <p className="text-sm font-bold text-[#2C332B]">{day.getDate()}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 min-h-[450px]">
                {getWeekDays(currentDate).map((day, idx) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const dayBookings = bookings.filter(b => b.start_time.startsWith(dateStr) && b.status !== 'cancelled');
                  const dayBlocks = blockedTimes.filter(bt => bt.start_time.startsWith(dateStr));

                  return (
                    <div key={idx} className="p-2 border rounded-xl bg-[#FAF9F6] space-y-2 overflow-y-auto">
                      {dayBookings.map(b => (
                        <div key={b.id} onClick={() => { setSelectedBlockTime(null); setSelectedBooking(b); }} className={`p-2 bg-white border rounded-lg text-xs cursor-pointer shadow-sm hover:border-[#6B8E70] ${selectedBooking?.id === b.id ? 'border-[#6B8E70] bg-emerald-50' : ''}`}>
                          <p className="font-bold text-[#6B8E70]">{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="font-serif text-sm truncate">{b.client_name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{b.treatments?.title}</p>
                        </div>
                      ))}
                      {dayBlocks.map(bt => {
                        const startTime = new Date(bt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const endTime = new Date(bt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={bt.id} onClick={() => { setSelectedBooking(null); setSelectedBlockTime(bt); }} className={`p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 cursor-pointer hover:bg-amber-100 ${selectedBlockTime?.id === bt.id ? 'ring-2 ring-amber-600' : ''}`}>
                            <p className="font-bold">{startTime} - {endTime}</p>
                            <p className="italic text-[10px]">{bt.reason}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Schedule for {currentDate.toLocaleDateString()}</h3>
              
              {/* Blocked Times on Day View */}
              {blockedTimes.filter(bt => bt.start_time.startsWith(currentDate.toISOString().split('T')[0])).map(bt => {
                const startTime = new Date(bt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(bt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={bt.id} onClick={() => { setSelectedBooking(null); setSelectedBlockTime(bt); }} className={`p-4 rounded-xl border bg-amber-50 border-amber-200 cursor-pointer hover:bg-amber-100 flex justify-between items-center ${selectedBlockTime?.id === bt.id ? 'ring-2 ring-amber-600' : ''}`}>
                    <div>
                      <p className="font-bold text-amber-900">Blocked Time: {startTime} - {endTime}</p>
                      <p className="text-xs text-amber-800 italic">{bt.reason}</p>
                    </div>
                    <span className="text-xs text-amber-900 font-semibold">Edit &rarr;</span>
                  </div>
                );
              })}

              {bookings.filter(b => b.start_time.startsWith(currentDate.toISOString().split('T')[0]) && b.status !== 'cancelled').length === 0 && blockedTimes.filter(bt => bt.start_time.startsWith(currentDate.toISOString().split('T')[0])).length === 0 ? (
                <p className="text-xs text-gray-400 py-8">No appointments or blocked times scheduled for this date.</p>
              ) : (
                bookings.filter(b => b.start_time.startsWith(currentDate.toISOString().split('T')[0]) && b.status !== 'cancelled').map(b => (
                  <div key={b.id} onClick={() => { setSelectedBlockTime(null); setSelectedBooking(b); }} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center ${selectedBooking?.id === b.id ? 'border-[#6B8E70] bg-[#FAF9F6]' : 'border-[#E5E7EB]'}`}>
                    <div>
                      <p className="font-serif text-lg text-[#2C332B]">{b.client_name} ({b.treatments?.title})</p>
                      <p className="text-xs text-[#6B7280]">Time: {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className="text-xs text-[#6B8E70]">View &rarr;</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Booking Details Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <h3 className="font-serif text-xl text-[#2C332B]">{selectedBooking.client_name}</h3>
                  <span className="text-[10px] px-2 py-0.5 uppercase rounded-full bg-emerald-100 text-emerald-700">{selectedBooking.status || 'Confirmed'}</span>
                </div>
                <button onClick={() => { setSelectedBooking(null); setIsEditingBooking(false); }} className="text-xs text-gray-400 hover:text-black font-bold text-lg">&times;</button>
              </div>

              {isEditingBooking ? (
                <form onSubmit={handleSaveEditedBooking} className="space-y-3 text-xs pt-2">
                  <h4 className="font-semibold uppercase tracking-wider text-[#6B8E70]">Edit Appointment</h4>
                  <div>
                    <label className="block uppercase mb-1">Treatment</label>
                    <select value={editTreatmentId} onChange={(e) => setEditTreatmentId(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white" required>
                      {treatments.map(t => (
                        <option key={t.id} value={t.id}>{t.title} (£{t.price_gbp})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block uppercase mb-1">Date</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full p-2.5 border rounded-xl" required />
                  </div>
                  <div>
                    <label className="block uppercase mb-1">Time</label>
                    <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="w-full p-2.5 border rounded-xl" required />
                  </div>
                  <div>
                    <label className="block uppercase mb-1">Price Override (£)</label>
                    <input type="number" step="0.01" value={editPriceOverride} onChange={(e) => setEditPriceOverride(e.target.value)} placeholder="Leave blank for standard price" className="w-full p-2.5 border rounded-xl" />
                  </div>
                  {editPriceOverride && (
                    <div>
                      <label className="block uppercase mb-1">Override Reason</label>
                      <input type="text" value={editOverrideReason} onChange={(e) => setEditOverrideReason(e.target.value)} placeholder="e.g. Family discount, VIP" className="w-full p-2.5 border rounded-xl" required />
                    </div>
                  )}
                  <div className="flex space-x-2 pt-2">
                    <button type="button" onClick={() => setIsEditingBooking(false)} className="w-1/2 py-2.5 border rounded-xl uppercase font-semibold">Cancel</button>
                    <button type="submit" className="w-1/2 py-2.5 bg-[#6B8E70] text-white rounded-xl uppercase font-semibold">Save Changes</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="text-xs space-y-1.5 text-[#6B7280]">
                    <p><strong>Email:</strong> {selectedBooking.client_email}</p>
                    <p><strong>Phone:</strong> {selectedBooking.client_phone}</p>
                    <p><strong>Treatment:</strong> {selectedBooking.treatments?.title} (£{selectedBooking.price_override ?? selectedBooking.treatments?.price_gbp})</p>
                    {selectedBooking.price_override !== undefined && selectedBooking.price_override !== null && (
                      <p className="text-emerald-700 italic">Price overridden (Reason: {selectedBooking.override_reason})</p>
                    )}
                    <p><strong>Time:</strong> {new Date(selectedBooking.start_time).toLocaleString()}</p>
                    <p className="font-semibold text-[#2C332B]">
                      Marketing Opt-In: <span className={selectedBooking.marketing_opt_in ? 'text-emerald-700 font-bold' : 'text-gray-500 font-normal'}>{selectedBooking.marketing_opt_in ? 'Yes (Opted In)' : 'No Consent'}</span>
                    </p>
                    {selectedBooking.notes && <p className="italic bg-[#FAF9F6] p-2.5 rounded-xl mt-2">Note: {selectedBooking.notes}</p>}
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Consultation Form Status</h4>
                    {selectedBooking?.consultations?.[0] ? (
                      <div className="p-4 bg-[#FAF9F6] border rounded-xl space-y-1.5 text-xs">
                        <p className="text-emerald-700 font-medium">✓ Form Completed</p>
                        <p><strong>Medical:</strong> {selectedBooking.consultations[0].medical_conditions || 'None'}</p>
                        <p><strong>Allergies:</strong> {selectedBooking.consultations[0].allergies || 'None'}</p>
                        <p><strong>Pressure:</strong> {selectedBooking.consultations[0].pressure_preference || 'Standard'}</p>
                        <p><strong>Emergency:</strong> {selectedBooking.consultations[0].emergency_contact || 'None'}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-[#FAF9F6] border rounded-xl space-y-2 text-xs">
                        <p className="text-amber-700 italic">No consultation form completed yet.</p>
                        <button onClick={() => handleSendConsultationEmail(selectedBooking.client_email, selectedBooking.client_name)} className="mt-2 w-full py-2 bg-[#6B8E70] text-white text-[10px] uppercase rounded-lg flex items-center justify-center space-x-1">
                          <Send className="w-3 h-3" /> <span>Trigger Form Email</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <button onClick={() => setIsEditingBooking(true)} className="w-full py-2.5 bg-[#FAF9F6] border text-xs uppercase rounded-xl flex items-center justify-center space-x-1.5 hover:bg-gray-50">
                      <RefreshCw className="w-3.5 h-3.5" /> <span>Edit Appointment</span>
                    </button>
                    <button onClick={() => handleCancelBooking(selectedBooking.id)} className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 text-xs uppercase rounded-xl flex items-center justify-center space-x-1.5 hover:bg-red-100">
                      <XCircle className="w-3.5 h-3.5" /> <span>Cancel Appointment</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Selected Blocked Time Modal */}
        {selectedBlockTime && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-start border-b pb-3">
                <h3 className="font-serif text-xl text-amber-900">Edit Blocked Time</h3>
                <button onClick={() => setSelectedBlockTime(null)} className="text-xs text-gray-400 hover:text-black font-bold text-lg">&times;</button>
              </div>
              <form onSubmit={handleUpdateBlockedTime} className="space-y-3 text-xs">
                <div>
                  <label className="block uppercase mb-1 font-semibold">Date</label>
                  <input type="date" value={editBlockDate} onChange={(e) => setEditBlockDate(e.target.value)} className="w-full p-2.5 border rounded-xl" required />
                </div>
                <div>
                  <label className="block uppercase mb-1 font-semibold">Start Time</label>
                  <input type="time" value={editBlockStart} onChange={(e) => setEditBlockStart(e.target.value)} className="w-full p-2.5 border rounded-xl" required />
                </div>
                <div>
                  <label className="block uppercase mb-1 font-semibold">End Time</label>
                  <input type="time" value={editBlockEnd} onChange={(e) => setEditBlockEnd(e.target.value)} className="w-full p-2.5 border rounded-xl" required />
                </div>
                <div>
                  <label className="block uppercase mb-1 font-semibold">Reason</label>
                  <input type="text" value={editBlockReason} onChange={(e) => setEditBlockReason(e.target.value)} className="w-full p-2.5 border rounded-xl" required />
                </div>
                <div className="flex space-x-2 pt-2">
                  <button type="submit" className="w-1/2 py-2.5 bg-[#6B8E70] text-white uppercase rounded-xl font-semibold">Save</button>
                  <button type="button" onClick={() => handleRemoveBlock(selectedBlockTime.id)} className="w-1/2 py-2.5 bg-red-50 text-red-600 border border-red-200 uppercase rounded-xl flex items-center justify-center space-x-1 font-semibold">
                    <Trash2 className="w-3.5 h-3.5" /> <span>Remove</span>
                  </button>
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
                <h3 className="font-serif text-xl font-bold">Create Manual Booking</h3>
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Booking Date</label>
                    <input
                      type="date"
                      value={bookingDateStr}
                      onChange={(e) => setBookingDateStr(e.target.value)}
                      className="w-full border p-2.5 rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Time (Anytime)</label>
                    <input
                      type="time"
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="w-full border p-2.5 rounded-xl text-xs font-mono"
                      required
                    />
                  </div>
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
                          className="w-full border p-2.5 rounded-xl bg-white text-xs"
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
                      <input type="text" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs" required={clientMode === 'new'} />
                      <input type="email" placeholder="Email Address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs" required={clientMode === 'new'} />
                      <input type="tel" placeholder="Phone Number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full border p-2.5 rounded-xl text-xs" />
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
                  <textarea rows={2} value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} placeholder="Notes..." className="w-full border p-2.5 rounded-xl text-xs" />
                </div>

                <div className="flex space-x-3 pt-4 border-t">
                  <button type="button" onClick={() => setIsBookingModalOpen(false)} className="w-1/2 py-2.5 border rounded-xl text-xs uppercase font-semibold">Cancel</button>
                  <button type="submit" disabled={isSubmittingBooking} className="w-1/2 py-2.5 bg-[#6B8E70] text-white rounded-xl text-xs uppercase font-semibold hover:bg-[#5B7B60] transition disabled:opacity-50">
                    {isSubmittingBooking ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}