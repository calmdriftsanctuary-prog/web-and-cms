import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { recipientName, recipientEmail, treatmentTitle, valueGbp } = await request.json();
    if (!recipientName || !recipientEmail || !valueGbp) {
      return NextResponse.json({ error: 'recipientName, recipientEmail, and valueGbp are required.' }, { status: 400 });
    }

    // Generate unique reference code, e.g. CDS-VCH-XXXX
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const voucherCode = `CDS-VCH-${randomHex}`;
    const issuedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase();

    // 1. Insert into Supabase
    const { error: insertErr } = await supabase.from('vouchers').insert([{
      code: voucherCode,
      recipient_name: recipientName,
      recipient_email: recipientEmail.trim().toLowerCase(),
      initial_value_gbp: Number(valueGbp),
      remaining_value_gbp: Number(valueGbp),
      is_active: true
    }]);

    if (insertErr) throw insertErr;

    // 2. Generate QR Code as a data URL buffer
    const qrDataUrl = await QRCode.toDataURL(voucherCode, { width: 300, margin: 1 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // 3. Generate PDF over the Canva background
    const pdfDoc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks: Buffer[] = [];

    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfBufferPromise = new Promise<Buffer>((resolve) => {
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Load background image from public folder
    const bgPath = path.join(process.cwd(), 'public', 'voucher-bng.png');
    if (fs.existsSync(bgPath)) {
      // A4 Landscape dimensions in points: ~841.89 x 595.28
      pdfDoc.image(bgPath, 0, 0, { width: 841.89, height: 595.28 });
    }

    // Configure text styling to match your dark brown branding (#693f00 or dark charcoal)
    pdfDoc.fillColor('#2C332B');

    // Box 1: Treatment Title (approx coordinates for top white box)
    pdfDoc.fontSize(16).text(treatmentTitle || `£${valueGbp} Gift Voucher`, 65, 185, { width: 450, align: 'center' });

    // Box 2: Issued Date (approx coordinates for Issued: box)
    pdfDoc.fontSize(12).text(issuedDate, 175, 298, { width: 140, align: 'center' });

    // Box 3: Voucher Reference (approx coordinates for bottom left box)
    pdfDoc.fontSize(14).fillColor('#693F00').text(voucherCode, 315, 523, { width: 180, align: 'center' });

    // Box 4: QR Code (approx coordinates for bottom right white box)
    pdfDoc.image(qrBuffer, 665, 410, { width: 115, height: 115 });

    pdfDoc.end();
    const pdfBuffer = await pdfBufferPromise;

    // 4. Send Email via Resend with attached PDF
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
        to: [recipientEmail.trim().toLowerCase()],
        subject: `Your Gift Voucher - Calm Drift Sanctuary`,
        html: `
          <div style="font-family:sans-serif; color:#2C332B; padding:25px; background:#FAF9F6; border-radius:12px; max-width:600px; margin:0 auto;">
            <h2 style="color:#693F00; margin-top:0; text-transform:lowercase;">your gift voucher is ready</h2>
            <p style="text-transform:lowercase;">dear ${recipientName},</p>
            <p style="text-transform:lowercase;">attached is your digital gift voucher for calm drift sanctuary. you can print it out or present it on your phone when you visit.</p>
            <p style="text-transform:lowercase; font-weight:bold; margin:20px 0;">voucher reference: ${voucherCode}</p>
            <p style="font-size:12px; color:#6b7280; margin-top:30px; border-top:1px solid #E5E7EB; padding-top:15px; text-transform:lowercase;">warm regards,<br>the calm drift sanctuary team</p>
          </div>
        `,
        attachments: [
          {
            filename: `Calm-Drift-Voucher-${voucherCode}.pdf`,
            content: pdfBuffer,
          },
        ],
      });
    }

    return NextResponse.json({ success: true, voucherCode });

  } catch (err: any) {
    console.error('Voucher Generation Error:', err);
    return NextResponse.json({ error: err.message || 'internal server error' }, { status: 500 });
  }
}