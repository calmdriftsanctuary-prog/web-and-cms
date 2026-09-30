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
    const { purchaserName, purchaserEmail, recipientName, treatmentTitle, valueGbp } = await request.json();
    if (!purchaserName || !purchaserEmail || !recipientName || !valueGbp) {
      return NextResponse.json({ error: 'purchaserName, purchaserEmail, recipientName, and valueGbp are required.' }, { status: 400 });
    }

    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const voucherCode = `CDS-VCH-${randomHex}`;
    const issuedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // 1. Insert into Supabase
    const { error: insertErr } = await supabase.from('vouchers').insert([{
      code: voucherCode,
      recipient_name: recipientName,
      recipient_email: purchaserEmail.trim().toLowerCase(),
      initial_value_gbp: Number(valueGbp),
      remaining_value_gbp: Number(valueGbp),
      is_active: true
    }]);

    if (insertErr) throw insertErr;

    // 2. Generate QR Code
    const qrDataUrl = await QRCode.toDataURL(voucherCode, { width: 300, margin: 1 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // 3. Generate PDF over Landscape A4 Background (Width: 841.89, Height: 595.28)
    const pdfDoc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks: Buffer[] = [];

    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfBufferPromise = new Promise<Buffer>((resolve) => {
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const bgPath = path.join(process.cwd(), 'public', 'voucher-bng.png');
    if (fs.existsSync(bgPath)) {
      pdfDoc.image(bgPath, 0, 0, { width: 841.89, height: 595.28 });
    }

    const fontPath = path.join(process.cwd(), 'public', 'TheSeasons.ttf');
    const fontToUse = fs.existsSync(fontPath) ? fontPath : 'Times-Roman';

    pdfDoc.registerFont('CustomSerif', fontToUse);
    pdfDoc.font('CustomSerif').fillColor('#2C332B');

    // Adjusted coordinates for clean alignment on the background template
    // Treatment or Value text line
    pdfDoc.fontSize(20).text(treatmentTitle || `£${valueGbp} Gift Voucher`, 80, 240, { width: 420, align: 'center' });

    // Issued Date line
    pdfDoc.fontSize(12).text(issuedDate, 115, 375, { width: 140, align: 'center' });

    // Voucher Reference line
    pdfDoc.fontSize(13).fillColor('#693F00').text(voucherCode, 230, 435, { width: 180, align: 'center' });

    // QR Code Position
    pdfDoc.image(qrBuffer, 660, 375, { width: 110, height: 110 });

    pdfDoc.end();
    const pdfBuffer = await pdfBufferPromise;

    // 4. Send Email via Resend to Purchaser
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
        to: [purchaserEmail.trim().toLowerCase()],
        subject: `Your Gift Voucher - Calm Drift Sanctuary`,
        html: `
          <div style="font-family:sans-serif; color:#2C332B; padding:25px; background:#FAF9F6; border-radius:12px; max-width:600px; margin:0 auto;">
            <h2 style="color:#693F00; margin-top:0; text-transform:lowercase;">your gift voucher is ready</h2>
            <p style="text-transform:lowercase;">dear ${purchaserName},</p>
            <p style="text-transform:lowercase;">thank you for purchasing a gift voucher for ${recipientName}. attached is your digital gift voucher PDF.</p>
            <p style="text-transform:lowercase;">this voucher can be printed or presented digitally at point of treatment.</p>
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