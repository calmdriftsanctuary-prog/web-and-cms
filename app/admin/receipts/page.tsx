'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdHocReceiptSender() {
  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    treatmentDate: todayStr,
    treatmentName: '',
    treatmentDetails: '',
    amountPaid: '',
    paymentMethod: 'Bank Transfer'
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('sent_receipts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send receipt');

      setSuccessMsg(`Receipt ${data.receiptRef} successfully sent to client.`);
      setFormData({
        clientName: '',
        clientEmail: '',
        treatmentDate: todayStr,
        treatmentName: '',
        treatmentDetails: '',
        amountPaid: '',
        paymentMethod: 'Bank Transfer'
      });
      fetchHistory();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Generator Card */}
      <div style={{ background: '#FAF9F6', padding: '32px', borderRadius: '12px', border: '1px solid #E5E7EB', width: '100%', maxWidth: '640px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
        <h3 style={{ color: '#693F00', marginTop: 0, marginBottom: '24px', textTransform: 'lowercase', fontSize: '20px', fontWeight: '600' }}>send ad hoc receipt</h3>
        
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#2C332B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Client Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                value={formData.clientName}
                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#2C332B', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#2C332B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Client Email
              </label>
              <input
                type="email"
                placeholder="e.g. sarah@example.com"
                value={formData.clientEmail}
                onChange={e => setFormData({ ...formData, clientEmail: e.target.value })}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#2C332B', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#2C332B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Date of Treatment
              </label>
              <input
                type="date"
                value={formData.treatmentDate}
                onChange={e => setFormData({ ...formData, treatmentDate: e.target.value })}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#2C332B', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#2C332B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Treatment Name
              </label>
              <input
                type="text"
                placeholder="e.g. Bespoke Full Body Massage"
                value={formData.treatmentName}
                onChange={e => setFormData({ ...formData, treatmentName: e.target.value })}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#2C332B', fontSize: '14px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#2C332B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Treatment Details / Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 60-minute deep tissue back, neck & shoulder session with aromatherapy oils"
              value={formData.treatmentDetails}
              onChange={e => setFormData({ ...formData, treatmentDetails: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#2C332B', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#2C332B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Amount Paid (£)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 75.00"
                value={formData.amountPaid}
                onChange={e => setFormData({ ...formData, amountPaid: e.target.value })}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#2C332B', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#2C332B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#ffffff', color: '#2C332B', boxSizing: 'border-box', fontSize: '14px' }}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Card Reader">Card Reader</option>
                <option value="Gift Voucher">Gift Voucher</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ background: '#693F00', color: '#fff', padding: '12px', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px', marginTop: '8px', letterSpacing: '0.5px' }}
          >
            {loading ? 'Sending...' : 'Send Receipt Email'}
          </button>

          {successMsg && <p style={{ color: '#16a765', fontSize: '13px', margin: 0, textAlign: 'center', fontWeight: '600' }}>{successMsg}</p>}
        </form>
      </div>

      {/* History Log Table */}
      <div style={{ width: '100%', maxWidth: '920px' }}>
        <h4 style={{ color: '#2C332B', textTransform: 'lowercase', marginBottom: '16px', fontSize: '16px' }}>sent receipts history</h4>
        <div style={{ background: '#FAF9F6', borderRadius: '12px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F3F4F6', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                <th style={{ padding: '12px 16px' }}>Ref</th>
                <th style={{ padding: '12px 16px' }}>Client</th>
                <th style={{ padding: '12px 16px' }}>Treatment &amp; Details</th>
                <th style={{ padding: '12px 16px' }}>Treatment Date</th>
                <th style={{ padding: '12px 16px' }}>Amount</th>
                <th style={{ padding: '12px 16px' }}>Method</th>
                <th style={{ padding: '12px 16px' }}>Date of Issue</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>No ad hoc receipts sent yet.</td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 'bold', color: '#693F00', whiteSpace: 'nowrap' }}>{item.receipt_ref}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#2C332B' }}>{item.client_name}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{item.client_email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#2C332B', maxWidth: '240px' }}>
                      <div style={{ fontWeight: '600' }}>{item.treatment_title}</div>
                      {item.treatment_details && (
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{item.treatment_details}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#2C332B', fontSize: '12px', whiteSpace: 'nowrap' }}>{item.treatment_date || '-'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#2C332B', whiteSpace: 'nowrap' }}>£{Number(item.amount_paid).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', color: '#4B5563', whiteSpace: 'nowrap' }}>{item.payment_method}</td>
                    <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
