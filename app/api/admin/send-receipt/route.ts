import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { clientName, clientEmail, treatmentTitle, amountPaid, paymentMethod } = await request.json();

    if (!clientEmail || !amountPaid || !treatmentTitle) {
      return NextResponse.json({ error: 'Missing required receipt fields' }, { status: 400 });
    }

    const receiptRef = `CDS-${Math.floor(100000 + Math.random() * 900000)}`;
    const issueDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/London'
    });

    await resend.emails.send({
      from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
      to: [clientEmail],
      subject: `Payment Receipt [${receiptRef}] - Calm Drift Sanctuary`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; color: #2C332B; background: #FAF9F6; border-radius: 12px; border: 1px solid #E5E7EB;">
          <h2 style="color: #693F00; margin-top: 0; text-transform: lowercase;">payment receipt</h2>
          <p style="text-transform: lowercase;">dear ${clientName || 'guest'},</p>
          <p style="text-transform: lowercase;">thank you for your payment. below are the details of your transaction at calm drift sanctuary.</p>
          
          <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #E5E7EB; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Receipt Reference:</strong> ${receiptRef}</p>
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Date:</strong> ${issueDate}</p>
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Item / Treatment:</strong> ${treatmentTitle}</p>
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p style="margin: 0; font-size: 15px; color: #693F00;"><strong>Total Paid:</strong> £${amountPaid}</p>
          </div>

          <div style="margin: 15px 0; padding: 15px; background: #ffffff; border-radius: 8px; border: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 13px;"><strong>Calm Drift Sanctuary</strong><br/>Talke, Stoke-on-Trent, ST7<br/>what3words: ///converged.archives.downturn</p>
          </div>

          <p style="font-size: 12px; color: #6b7280; margin-top: 30px; border-top: 1px solid #E5E7EB; padding-top: 15px; text-transform: lowercase;">
            warm regards,<br>the calm drift sanctuary team
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, receiptRef });
  } catch (err: any) {
    console.error('Receipt Send Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send receipt' }, { status: 500 });
  }
}
