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
    const { purchaserName, purchaserEmail, recipientName, valueGbp } = await request.json();
    if (!purchaserName || !purchaserEmail || !recipientName || !valueGbp) {
      return NextResponse.json({ error: 'purchaserName, purchaserEmail, recipientName, and valueGbp are required.' }, { status: 400 });
    }

    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const voucherCode = `CDS-VCH-${randomHex}`;
    const receiptRef = `CDS-RCP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    
    const expiryDateObj = new Date();
    expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 1);
    const expiryDate = expiryDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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

    // 2. Generate QR Code Buffer
    const qrDataUrl = await QRCode.toDataURL(voucherCode, { width: 500, margin: 1 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // 3. Exact Photoshop Canvas Resolution (1684 x 1191)
    const pw = 1684;
    const ph = 1191;

    const pdfDoc = new PDFDocument({ size: [pw, ph], margin: 0 });
    const chunks: Buffer[] = [];

    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfBufferPromise = new Promise<Buffer>((resolve) => {
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const bgPath = path.join(process.cwd(), 'public', 'voucher-bng.png');
    if (fs.existsSync(bgPath)) {
      pdfDoc.image(bgPath, 0, 0, { width: pw, height: ph });
    } else {
      console.error('CRITICAL: voucher-bng.png not found at path:', bgPath);
    }

    const fontPath = path.join(process.cwd(), 'public', 'TheSeasons.ttf');
    const fontToUse = fs.existsSync(fontPath) ? fontPath : 'Times-Roman';

    pdfDoc.registerFont('CustomSerif', fontToUse);
    pdfDoc.font('CustomSerif').fillColor('#2C332B');

    const displayValueText = `£${valueGbp} Gift Voucher`;

    // -- EXACT PHOTOSHOP COORDINATES & SIZES (Value replaces treatment name) --
    // 1. Voucher Value (Size 80px, X: 131, Y: 373, Left-aligned)
    pdfDoc.fontSize(80).text(displayValueText, 131, 373, { width: 1300, align: 'left', lineBreak: false });

    // 2. Issued Date (Size 36px, X: 240, Y: 544, Left-aligned)
    pdfDoc.fontSize(36).text(currentDate, 240, 544, { width: 500, align: 'left', lineBreak: false });

    // 3. Voucher Reference (Size 37px, X: 460, Y: 1116, Left-aligned)
    pdfDoc.fontSize(37).fillColor('#693F00').text(voucherCode, 460, 1116, { width: 600, align: 'left', lineBreak: false });

    // 4. QR Code (188x188 px, X: 1449, Y: 947)
    pdfDoc.image(qrBuffer, 1449, 947, { width: 188, height: 188 });

    pdfDoc.end();
    const pdfBuffer = await pdfBufferPromise;

    // 4. Send Email via Resend with Receipt & Value Voucher PDF
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
        to: [purchaserEmail.trim().toLowerCase()],
        subject: `Payment Receipt & Gift Voucher - Calm Drift Sanctuary`,
        html: `
          <div style="font-family:sans-serif; color:#2C332B; padding:30px; background:#FAF9F6; border-radius:16px; max-width:650px; margin:0 auto; line-height: 1.6;">
            <div style="text-align: center; border-bottom: 1px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 20px;">
              <h1 style="font-family: serif; color:#693F00; margin:0 0 5px 0; text-transform: lowercase; font-size: 24px;">calm drift sanctuary</h1>
              <p style="font-size: 12px; color: #6b7280; margin: 0; text-transform: lowercase;">stoke-on-trent, staffordshire<br>email: calmdriftsanctuary@gmail.com | website: calmdriftsanctuary.co.uk</p>
            </div>

            <h2 style="color:#693F00; font-size: 18px; text-transform: lowercase; margin-top: 0;">payment receipt & gift voucher confirmation</h2>
            
            <p style="text-transform: lowercase;">dear ${purchaserName},</p>
            <p style="text-transform: lowercase;">thank you for your purchase! your digital monetary gift voucher for <strong>${recipientName}</strong> (worth £${valueGbp}) is attached as a PDF to this email. below is your official payment receipt and voucher summary.</p>

            <div style="background: #ffffff; border: 1px solid #E5E7EB; padding: 20px; border-radius: 12px; margin: 20px 0; font-size: 13px;">
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>receipt reference number:</strong> ${receiptRef}</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>date of purchase:</strong> ${currentDate}</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>purchaser name:</strong> ${purchaserName}</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>item description:</strong> monetary gift voucher (£${valueGbp})</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>total amount paid:</strong> £${valueGbp}.00</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>payment method:</strong> online checkout</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>voucher reference number:</strong> <span style="color:#693F00; font-weight: bold;">${voucherCode}</span></p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>voucher issue date:</strong> ${currentDate}</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>expiry date:</strong> ${expiryDate}</p>
            </div>

            <div style="margin-top: 20px;">
              <h3 style="font-size: 14px; color: #693F00; text-transform: lowercase; margin-bottom: 5px;">redemption instructions</h3>
              <p style="font-size: 13px; text-transform: lowercase; margin-top: 0;">to redeem your voucher, please contact us directly via facebook or instagram at @calmdriftsanctuary, online at calmdriftsanctuary.co.uk, or by emailing calmdriftsanctuary@gmail.com. this voucher can be used toward any treatments or services, and can be redeemed across multiple visits if a balance remains.</p>
            </div>

            <div style="margin-top: 20px; border-top: 1px solid #E5E7EB; padding-top: 15px;">
              <h3 style="font-size: 14px; color: #693F00; text-transform: lowercase; margin-bottom: 5px;">terms and conditions</h3>
              <p style="font-size: 11px; color: #6b7280; text-transform: lowercase; line-height: 1.5;">gift vouchers are valid for 12 months from the date of issue and must be redeemed within this period. vouchers are non-refundable, non-transferable, and cannot be exchanged for cash. appointments are subject to availability and must be booked in advance quoting the unique voucher reference. a mandatory pre-treatment consultation form, including a medical screening and liability waiver, must be completed prior to any session. calm drift sanctuary reserves the right to refuse treatment if necessary health disclosures are missing or if a medical contraindication is present. cancellations or rescheduling require at least 24 hours' notice, otherwise the voucher may be rendered void. lost or stolen vouchers cannot be replaced.</p>
            </div>

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

    return NextResponse.json({ success: true, voucherCode, receiptRef });

  } catch (err: any) {
    console.error('Voucher Generation Error:', err);
    return NextResponse.json({ error: err.message || 'internal server error' }, { status: 500 });
  }
}