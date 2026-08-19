'use client';

import { useState, useEffect } from 'react';

interface AvailabilityRule {
  id: string;
  date: string;
  is_full_day: boolean;
  start_time: string | null;
  end_time: string | null;
}

export default function AvailabilityManager() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isFullDay, setIsFullDay] = useState<boolean>(true);
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('20:00');
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/admin/availability');
      const data = await res.json();
      if (data.success) {
        setRules(data.availability);
      }
    } catch (err) {
      console.error('Failed to fetch availability rules', err);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      setMessage('Please select a date.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          isFullDay,
          startTime: isFullDay ? null : `${startTime}:00`,
          endTime: isFullDay ? null : `${endTime}:00`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage('Date successfully opened for bookings!');
        setSelectedDate('');
        fetchRules();
      } else {
        setMessage(data.error || 'Failed to open date.');
      }
    } catch (err) {
      setMessage('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to close this date/time?')) return;

    try {
      const res = await fetch(`/api/admin/availability?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchRules();
      } else {
        alert(data.error || 'Failed to remove availability rule.');
      }
    } catch (err) {
      alert('Error deleting availability rule.');
    }
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', marginBottom: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h3 style={{ color: '#2C332B', marginTop: '0', fontSize: '18px', fontWeight: '600' }}>Calendar Availability Manager (Closed by Default)</h3>
      <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '20px' }}>
        Your calendar is closed by default. Select a date below to open it up for client bookings.
      </p>

      <form onSubmit={handleOpenDate} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginBottom: '25px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Select Date to Open</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none' }}
            required
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '8px' }}>
          <input
            type="checkbox"
            id="fullDayToggle"
            checked={isFullDay}
            onChange={(e) => setIsFullDay(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#6B8E70' }}
          />
          <label htmlFor="fullDayToggle" style={{ fontSize: '14px', color: '#374151', fontWeight: '500', cursor: 'pointer' }}>Full Day Open (10:00 - 20:00)</label>
        </div>

        {!isFullDay && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ background: '#6B8E70', color: '#ffffff', border: 'none', padding: '11px 22px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', height: '42px' }}
        >
          {loading ? 'Opening...' : 'Open Date'}
        </button>
      </form>

      {message && <p style={{ fontSize: '14px', color: message.includes('success') ? '#047857' : '#DC2626', marginBottom: '20px' }}>{message}</p>}

      <h4 style={{ color: '#2C332B', fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>Currently Open Dates & Windows</h4>
      {rules.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>No dates are currently open. Clients cannot book until you open a date above.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {rules.map((rule) => (
            <div key={rule.id} style={{ background: '#FAF9F6', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: '#1F2937' }}>{rule.date}</strong>
                <span style={{ fontSize: '12px', color: '#6B7280', display: 'block' }}>
                  {rule.is_full_day ? 'Full Day (10:00 - 20:00)' : `${rule.start_time} - ${rule.end_time}`}
                </span>
              </div>
              <button
                onClick={() => handleDeleteRule(rule.id)}
                style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}