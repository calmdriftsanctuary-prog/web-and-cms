import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const {
      clientName,
      clientEmail,
      treatmentDate,
      treatmentName,
      treatmentDetails,
      amountPaid,
      paymentMethod
    } = await request.json();

    if (!clientEmail || !amountPaid || !treatmentName || !treatmentDate) {
      return NextResponse.json({ error: 'Missing required receipt fields' }, { status: 400 });
    }

    const receiptRef = `CDS-${Math.floor(100000 + Math.random() * 900000)}`;
    
    const dateOfIssue = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/London'
    });

    const formattedTreatmentDate = new Date(treatmentDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const formattedAmount = Number(amountPaid).toFixed(2);

    // 1. Send email via Resend
    await resend.emails.send({
      from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
      to: [clientEmail],
      subject: `Payment Receipt [${receiptRef}] - Calm Drift Sanctuary`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; color: #2C332B; background: #FAF9F6; border-radius: 12px; border: 1px solid #E5E7EB;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E5E7EB; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="color: #693F00; margin: 0; text-transform: lowercase; font-size: 22px;">payment receipt</h2>
            <span style="background: #E6F4EA; color: #137333; padding: 4px 12px; border-radius: 50px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Paid in Full</span>
          </div>

          <p style="text-transform: lowercase; margin-top: 0;">dear ${clientName || 'guest'},</p>
          <p style="text-transform: lowercase; line-height: 1.5;">thank you for visiting calm drift sanctuary. please find your official payment receipt and treatment summary below for your records.</p>
          
          <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #E5E7EB; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #2C332B;">
              <tr>
                <td style="padding: 6px 0; color: #6B7280; width: 42%;"><strong>Receipt Reference:</strong></td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #693F00;">${receiptRef}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;"><strong>Date of Issue:</strong></td>
                <td style="padding: 6px 0;">${dateOfIssue}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;"><strong>Date of Treatment:</strong></td>
                <td style="padding: 6px 0;">${formattedTreatmentDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280;"><strong>Client Name:</strong></td>
                <td style="padding: 6px 0;">${clientName || 'Valued Guest'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0 6px 0; border-top: 1px solid #F3F4F6; color: #6B7280;"><strong>Treatment Name:</strong></td>
                <td style="padding: 12px 0 6px 0; border-top: 1px solid #F3F4F6; font-weight: 600;">${treatmentName}</td>
              </tr>
              ${treatmentDetails ? `
              <tr>
                <td style="padding: 6px 0; color: #6B7280; vertical-align: top;"><strong>Treatment Details:</strong></td>
                <td style="padding: 6px 0; line-height: 1.5; white-space: pre-line;">${treatmentDetails}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 12px 0 6px 0; border-top: 1px solid #F3F4F6; color: #6B7280;"><strong>Payment Method:</strong></td>
                <td style="padding: 12px 0 6px 0; border-top: 1px solid #F3F4F6;">${paymentMethod}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0 0 0; font-size: 15px; color: #2C332B;"><strong>Total Paid:</strong></td>
                <td style="padding: 8px 0 0 0; font-size: 16px; font-weight: bold; color: #693F00;">£${formattedAmount}</td>
              </tr>
            </table>
          </div>

          <div style="margin: 15px 0; padding: 15px; background: #ffffff; border-radius: 8px; border: 1px solid #E5E7EB; font-size: 12px; color: #4B5563; line-height: 1.5;">
            <strong style="color: #2C332B;">Calm Drift Sanctuary</strong><br/>
            Practitioner: Charlotte Dawson<br/>
            Talke, Stoke-on-Trent, ST7<br/>
            what3words: ///converged.archives.downturn<br/>
            Web: calmdriftsanctuary.co.uk
          </div>

          <p style="font-size: 11px; color: #9CA3AF; margin-top: 20px; line-height: 1.4;">
            Please retain this email as proof of payment. If you require any further details for insurance or personal records, simply reply to this email.
          </p>

          <p style="font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #E5E7EB; padding-top: 15px; text-transform: lowercase;">
            warm regards,<br>charlotte &amp; the calm drift sanctuary team
          </p>
        </div>
      `,
    });

    // 2. Save history record to Supabase
    const { error: dbErr } = await supabase.from('sent_receipts').insert([{
      receipt_ref: receiptRef,
      client_name: clientName,
      client_email: clientEmail,
      treatment_date: formattedTreatmentDate,
      treatment_title: treatmentName,
      treatment_details: treatmentDetails || '',
      amount_paid: Number(amountPaid),
      payment_method: paymentMethod,
      created_at: new Date().toISOString()
    }]);

    if (dbErr) {
      console.error('Failed to log receipt history to Supabase:', dbErr);
    }

    return NextResponse.json({ success: true, receiptRef });
  } catch (err: any) {
    console.error('Receipt Send Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send receipt' }, { status: 500 });
  }
}
