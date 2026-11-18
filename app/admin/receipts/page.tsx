'use client';
import { useState } from 'react';

export default function AdHocReceiptSender() {
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    treatmentTitle: '',
    amountPaid: '',
    paymentMethod: 'Bank Transfer'
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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

      setSuccessMsg('Receipt successfully sent to client.');
      setFormData({ clientName: '', clientEmail: '', treatmentTitle: '', amountPaid: '', paymentMethod: 'Bank Transfer' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FAF9F6', padding: '32px', borderRadius: '12px', border: '1px solid #E5E7EB', width: '100%', maxWidth: '540px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h3 style={{ color: '#693F00', marginTop: 0, marginBottom: '24px', textTransform: 'lowercase', fontSize: '20px', fontWeight: '600' }}>send ad hoc receipt</h3>
        
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#2C332B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Client Name
            </label>
            <input
              type="text"
              placeholder="e.g. Charlotte Johnson"
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
              placeholder="e.g. charlotte@example.com"
              value={formData.clientEmail}
              onChange={e => setFormData({ ...formData, clientEmail: e.target.value })}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#2C332B', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#2C332B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Treatment / Item Description
            </label>
            <input
              type="text"
              placeholder="e.g. Bespoke Full Body Massage"
              value={formData.treatmentTitle}
              onChange={e => setFormData({ ...formData, treatmentTitle: e.target.value })}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#2C332B', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#2C332B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Amount Paid (£)
            </label>
            <input
              type="text"
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

          <button
            type="submit"
            disabled={loading}
            style={{ background: '#693F00', color: '#fff', padding: '12px', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px', marginTop: '8px', letterSpacing: '0.5px' }}
          >
            {loading ? 'Sending...' : 'Send Receipt Email'}
          </button>

          {successMsg && <p style={{ color: '#16a765', fontSize: '13px', margin: 0, textAlign: 'center' }}>{successMsg}</p>}
        </form>
      </div>
    </div>
  );
}
