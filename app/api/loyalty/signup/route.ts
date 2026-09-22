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
    const { name, email, phone } = await request.json();
    if (!name || !email || !phone) {
      return NextResponse.json({ error: 'name, email, and phone are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\s+/g, '');

    // 1. De-duplication check matching email or phone
    const { data: existing } = await supabase
      .from('loyalty_cards')
      .select('*')
      .or(`client_email.eq.${cleanEmail},client_phone.eq.${cleanPhone}`)
      .single();

    if (existing) {
      if (process.env.RESEND_API_KEY && existing.apple_pass_url) {
        await sendWelcomeEmail(existing.client_name, existing.client_email, existing.apple_pass_url, existing.google_pass_url);
      }
      return NextResponse.json({ 
        success: true, 
        message: 'pass already exists. welcome email resent.',
        applePassUrl: existing.apple_pass_url,
        googlePassUrl: existing.google_pass_url 
      });
    }

    const serialNumber = `cds-${Math.random().toString(36).substring(2, 10)}`;

    if (!process.env.WALLET_API_KEY) {
      return NextResponse.json({ error: 'wallet api key is missing on server environment.' }, { status: 500 });
    }

    // 2. Call Wallet Wallet API according to official documentation specs
    const passRes = await fetch('https://api.walletwallet.dev/api/passes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WALLET_API_KEY}`
      },
      body: JSON.stringify({
        barcodeValue: serialNumber, // Encodes unique serial into QR code for camera scanning
        barcodeFormat: 'QR',
        logoText: 'Calm Drift Sanctuary',
        organizationName: 'Calm Drift Sanctuary',
        colorPreset: 'dark',
        primaryFields: [
          {
            label: 'CARD',
            value: 'Loyalty Card'
          }
        ],
        secondaryFields: [
          {
            label: 'MEMBER',
            value: name
          },
          {
            label: 'VISITS',
            value: '0/8'
          }
        ]
      })
    });
    
    const responseText = await passRes.text();
    console.log('WalletWallet Response Status:', passRes.status);
    console.log('WalletWallet Response Body:', responseText);

    let passData: any = {};
    try {
      passData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse WalletWallet JSON response');
    }

    // Map according to official response envelope: { serialNumber, googleSaveUrl, applePass, shareUrl }
    const googleUrl = passData.googleSaveUrl || '';
    const shareUrl = passData.shareUrl || '';
    
    // We can use the shareUrl or build direct links. 
    // WalletWallet provides googleSaveUrl for Android, and shareUrl handles cross-device landing page automatically.
    if (!passRes.ok || !googleUrl) {
      return NextResponse.json({ error: `wallet provider failed to generate pass: ${responseText}` }, { status: 502 });
    }

    // 3. Save mapping in Supabase with pass serial and links
    const { error: insertErr } = await supabase.from('loyalty_cards').insert([{
      client_name: name,
      client_email: cleanEmail,
      client_phone: cleanPhone,
      pass_serial: passData.serialNumber || serialNumber,
      stamps_count: 0,
      apple_pass_url: shareUrl, // shareUrl automatically handles Apple, Google, and desktop QR code view
      google_pass_url: googleUrl
    }]);

    if (insertErr) throw insertErr;

    // 4. Automated Welcome Email Delivery via Resend
    if (process.env.RESEND_API_KEY) {
      await sendWelcomeEmail(name, cleanEmail, shareUrl, googleUrl);
    }

    return NextResponse.json({ 
      success: true, 
      applePassUrl: shareUrl, 
      googlePassUrl: googleUrl 
    });

  } catch (err: any) {
    console.error('Loyalty Signup Error:', err);
    return NextResponse.json({ error: err.message || 'internal server error' }, { status: 500 });
  }
}

async function sendWelcomeEmail(name: string, email: string, shareUrl: string, googleUrl: string) {
  try {
    await resend.emails.send({
      from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
      to: [email],
      subject: `Your Digital Loyalty Card - Calm Drift Sanctuary`,
      html: `
        <div style="font-family:sans-serif; color:#2C332B; padding:25px; background:#FAF9F6; border-radius:12px; max-width:600px; margin:0 auto;">
          <h2 style="color:#693F00; margin-top:0; text-transform:lowercase;">welcome to our loyalty program</h2>
          <p style="text-transform:lowercase;">dear ${name},</p>
          <p style="text-transform:lowercase;">thank you for joining calm drift sanctuary rewards. install your digital stamp card directly into your phone wallet below:</p>
          
          <div style="text-align:center; margin:30px 0;">
            ${shareUrl ? `<a href="${shareUrl}" style="background-color:#693F00; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:50px; font-size:12px; font-weight:bold; display:inline-block; text-transform:uppercase;">install digital pass</a>` : ''}
          </div>

          <p style="font-size:12px; color:#6b7280; margin-top:30px; border-top:1px solid #E5E7EB; padding-top:15px; text-transform:lowercase;">collect 8 stamps to unlock 50% off on your 9th visit!</p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error('Failed to send loyalty welcome email:', emailErr);
  }
}