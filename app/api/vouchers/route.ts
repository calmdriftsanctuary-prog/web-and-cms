import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import QRCode from 'qrcode';
import puppeteer from 'puppeteer';

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

    // 2. Generate QR Code as Data URL
    const qrDataUrl = await QRCode.toDataURL(voucherCode, { width: 300, margin: 1 });

    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const bgImageUrl = `${protocol}://${host}/voucher-bng.png`;

    const displayTitle = treatmentTitle || `£${valueGbp} Gift Voucher`;

    // 3. Build HTML Template with absolute CSS overlaying on the Canva background
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @font-face {
              font-family: 'TheSeasons';
              src: url('${protocol}://${host}/TheSeasons.ttf');
            }
            body {
              margin: 0;
              padding: 0;
              width: 1122px;
              height: 794px; /* A4 Landscape at 96 DPI */
              -webkit-print-color-adjust: exact;
            }
            .voucher-container {
              position: relative;
              width: 1122px;
              height: 794px;
              background-image: url('${bgImageUrl}');
              background-size: cover;
              background-position: center;
              font-family: 'TheSeasons', 'Times New Roman', serif;
              color: #2C332B;
            }
            /* 1. Treatment Title Box */
            .box-title {
              position: absolute;
              top: 45%;
              left: 7.5%;
              width: 50%;
              text-align: center;
              font-size: 24px;
              font-weight: bold;
            }
            /* 2. Issued Date Box */
            .box-date {
              position: absolute;
              top: 63.5%;
              left: 17%;
              width: 20%;
              text-align: center;
              font-size: 18px;
            }
            /* 3. Voucher Reference Box */
            .box-ref {
              position: absolute;
              top: 70.8%;
              left: 33.5%;
              width: 22%;
              text-align: center;
              font-size: 20px;
              font-weight: bold;
              color: #693F00;
              letter-spacing: 1px;
            }
            /* 4. QR Code Box */
            .box-qr {
              position: absolute;
              top: 56.5%;
              left: 80.2%;
              width: 135px;
              height: 135px;
            }
            .box-qr img {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div class="voucher-container">
            <div class="box-title">${displayTitle}</div>
            <div class="box-date">${currentDate}</div>
            <div class="box-ref">${voucherCode}</div>
            <div class="box-qr"><img src="${qrDataUrl}" /></div>
          </div>
        </body>
      </html>
    `;

    // 4. Render PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    
    const pdfUint8 = await page.pdf({
      printBackground: true,
      format: 'A4',
      landscape: true,
    });
    await browser.close();

    const pdfBuffer = Buffer.from(pdfUint8);

    // 5. Send Email via Resend with Receipt & Voucher PDF
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
            <p style="text-transform: lowercase;">thank you for your purchase! your digital gift voucher for <strong>${recipientName}</strong> is attached as a PDF to this email. below is your official payment receipt and voucher summary.</p>

            <div style="background: #ffffff; border: 1px solid #E5E7EB; padding: 20px; border-radius: 12px; margin: 20px 0; font-size: 13px;">
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>receipt reference number:</strong> ${receiptRef}</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>date of purchase:</strong> ${currentDate}</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>purchaser name:</strong> ${purchaserName}</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>item description:</strong> gift voucher - ${treatmentTitle || `£${valueGbp} treatment`}</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>total amount paid:</strong> £${valueGbp}.00</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>payment method:</strong> online checkout</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>voucher reference number:</strong> <span style="color:#693F00; font-weight: bold;">${voucherCode}</span></p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>voucher issue date:</strong> ${currentDate}</p>
              <p style="margin: 6px 0; text-transform: lowercase;"><strong>expiry date:</strong> ${expiryDate}</p>
            </div>

            <div style="margin-top: 20px;">
              <h3 style="font-size: 14px; color: #693F00; text-transform: lowercase; margin-bottom: 5px;">redemption instructions</h3>
              <p style="font-size: 13px; text-transform: lowercase; margin-top: 0;">to redeem your voucher, please contact us directly via facebook or instagram at @calmdriftsanctuary, online at calmdriftsanctuary.co.uk, or by emailing calmdriftsanctuary@gmail.com. this voucher can be printed or presented digitally at point of treatment.</p>
            </div>

            <div style="margin-top: 20px; border-top: 1px solid #E5E7EB; padding-top: 15px;">
              <h3 style="font-size: 14px; color: #693F00; text-transform: lowercase; margin-bottom: 5px;">terms and conditions</h3>
              <p style="font-size: 11px; color: #6b7280; text-transform: lowercase; line-height: 1.5;">gift vouchers are valid for 12 months from the date of issue and must be redeemed within this period. vouchers are non-refundable, non-transferable, and cannot be exchanged for cash or alternative treatments. appointments are subject to availability and must be booked in advance quoting the unique voucher reference. a mandatory pre-treatment consultation form, including a medical screening and liability waiver, must be completed prior to the session. calm drift sanctuary reserves the right to refuse treatment if necessary health disclosures are missing or if a medical contraindication is present. cancellations or rescheduling require at least 24 hours' notice, otherwise the voucher may be rendered void. lost or stolen vouchers cannot be replaced.</p>
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