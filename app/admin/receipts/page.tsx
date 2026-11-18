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

      setSuccessMsg('Receipt successfully sent to client!');
      setFormData({ clientName: '', clientEmail: '', treatmentTitle: '', amountPaid: '', paymentMethod: 'Bank Transfer' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#FAF9F6', padding: '24px', borderRadius: '12px', border: '1px solid #E5E7EB', maxWidth: '600px' }}>
      <h3 style={{ color: '#693F00', marginTop: 0, textTransform: 'lowercase' }}>send ad hoc receipt</h3>
      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="text"
          placeholder="Client Name"
          value={formData.clientName}
          onChange={e => setFormData({ ...formData, clientName: e.target.value })}
          required
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
        />
        <input
          type="email"
          placeholder="Client Email"
          value={formData.clientEmail}
          onChange={e => setFormData({ ...formData, clientEmail: e.target.value })}
          required
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
        />
        <input
          type="text"
          placeholder="Treatment / Item Description (e.g., Bespoke Massage)"
          value={formData.treatmentTitle}
          onChange={e => setFormData({ ...formData, treatmentTitle: e.target.value })}
          required
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
        />
        <input
          type="text"
          placeholder="Amount Paid (e.g., 75.00)"
          value={formData.amountPaid}
          onChange={e => setFormData({ ...formData, amountPaid: e.target.value })}
          required
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
        />
        <select
          value={formData.paymentMethod}
          onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#fff' }}
        >
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Cash">Cash</option>
          <option value="Card Reader">Card Reader</option>
          <option value="Gift Voucher">Gift Voucher</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          style={{ background: '#693F00', color: '#fff', padding: '12px', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px' }}
        >
          {loading ? 'Sending...' : 'Send Receipt Email'}
        </button>
        {successMsg && <p style={{ color: '#16a765', fontSize: '13px', margin: 0 }}>{successMsg}</p>}
      </form>
    </div>
  );
}
