'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Calendar, DollarSign, Clock, Users, Sparkles, ArrowLeft } from 'lucide-react';

interface BookingRecord {
  id: string;
  client_name: string;
  start_time: string;
  end_time: string;
  status: string;
  treatments?: {
    title: string;
    price_gbp: number;
    duration_minutes: number;
  };
}

export default function AdminReportsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const thirtyDaysOut = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(thirtyDaysOut);

  useEffect(() => {
    fetch('/api/admin/bookings?bookings=true')
      .then((res) => res.json())
      .then((data) => {
        setBookings(data.bookings || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredBookings = bookings.filter((b) => {
    const bDate = b.start_time.split('T')[0];
    return bDate >= startDate && bDate <= endDate;
  });

  const activeBookings = filteredBookings.filter((b) => b.status !== 'cancelled');

  const overallIncome = activeBookings.reduce((sum, b) => sum + (b.treatments?.price_gbp || 0), 0);
  
  const treatmentBreakdown = activeBookings.reduce((acc: Record<string, { count: number; income: number }>, b) => {
    const title = b.treatments?.title || 'Unknown Treatment';
    if (!acc[title]) acc[title] = { count: 0, income: 0 };
    acc[title].count += 1;
    acc[title].income += b.treatments?.price_gbp || 0;
    return acc;
  }, {});

  const clientSpendMap = activeBookings.reduce((acc: Record<string, { count: number; spend: number }>, b) => {
    const client = b.client_name;
    if (!acc[client]) acc[client] = { count: 0, spend: 0 };
    acc[client].count += 1;
    acc[client].spend += b.treatments?.price_gbp || 0;
    return acc;
  }, {});

  const totalMinutesCompleted = activeBookings.reduce((sum, b) => sum + (b.treatments?.duration_minutes || 60), 0);
  const totalHoursCompleted = (totalMinutesCompleted / 60).toFixed(1);

  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const diffDays = Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
  const totalAvailableHours = diffDays * 8;
  const blockedHours = Math.max(0, (totalAvailableHours - parseFloat(totalHoursCompleted))).toFixed(1);

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans p-4 sm:p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b pb-6 gap-4">
          <div>
            <a href="/admin" className="text-xs text-[#6B8E70] hover:underline inline-flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Hub
            </a>
            <h1 className="font-serif text-3xl md:text-4xl">Business Analytics & Reports</h1>
          </div>
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-gray-500">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs font-medium bg-transparent" />
            </div>
            <span className="text-gray-400">—</span>
            <div>
              <label className="block text-[10px] uppercase font-semibold text-gray-500">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs font-medium bg-transparent" />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading reports...</div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-1">
                <span className="text-xs uppercase font-semibold text-gray-500">Overall Income</span>
                <p className="font-serif text-3xl text-[#6B8E70]">£{overallIncome}</p>
                <p className="text-[11px] text-gray-400">{activeBookings.length} completed/active bookings</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-1">
                <span className="text-xs uppercase font-semibold text-gray-500">Hours Completed</span>
                <p className="font-serif text-3xl text-gray-900">{totalHoursCompleted} hrs</p>
                <p className="text-[11px] text-gray-400">Treatment time delivered</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-1">
                <span className="text-xs uppercase font-semibold text-gray-500">Available vs Blocked</span>
                <p className="font-serif text-3xl text-gray-900">{blockedHours}h <span className="text-sm font-sans text-gray-400">/ {totalAvailableHours}h</span></p>
                <p className="text-[11px] text-gray-400">Capacity utilization</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-1">
                <span className="text-xs uppercase font-semibold text-gray-500">Active Clients</span>
                <p className="font-serif text-3xl text-gray-900">{Object.keys(clientSpendMap).length}</p>
                <p className="text-[11px] text-gray-400">Unique visitors in range</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border shadow-sm space-y-4">
                <h2 className="font-serif text-xl">Treatments Breakdown</h2>
                <div className="space-y-3">
                  {Object.entries(treatmentBreakdown).map(([title, stats]) => (
                    <div key={title} className="p-4 bg-[#FAF9F6] border rounded-xl flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium text-[#2C332B]">{title}</p>
                        <p className="text-xs text-gray-500">{stats.count} sessions booked</p>
                      </div>
                      <span className="font-serif font-semibold text-[#6B8E70]">£{stats.income}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl border shadow-sm space-y-4">
                <h2 className="font-serif text-xl">Client Treatment Volume & Spend</h2>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {Object.entries(clientSpendMap).map(([clientName, data]) => (
                    <div key={clientName} className="p-4 bg-[#FAF9F6] border rounded-xl flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium text-[#2C332B]">{clientName}</p>
                        <p className="text-xs text-gray-500">{data.count} treatment(s)</p>
                      </div>
                      <span className="font-serif font-semibold text-[#6B8E70]">£{data.spend}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}