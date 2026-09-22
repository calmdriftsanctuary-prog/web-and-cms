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
      if (process.env.RESEND_API_KEY) {
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

    // 2. Call Wallet Pass Provider API with correct field mapping
    let appleUrl = '';
    let googleUrl = '';

    if (process.env.WALLET_API_KEY) {
      const passRes = await fetch('https://api.walletwallet.dev/api/passes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WALLET_API_KEY}`
        },
        body: JSON.stringify({
          serialNumber: serialNumber,
          barcodeValue: serialNumber,
          secondaryFields: [
            { key: 'MEMBER', label: 'MEMBER', value: name },
            { key: 'VISITS', label: 'VISITS', value: '0/8' }
          ]
        })
      });
      
      const passData = await passRes.json();
      console.log('WalletWallet Response:', passData);
      
      appleUrl = passData.appleUrl || passData.applePassUrl || passData.url || '';
      googleUrl = passData.googleUrl || passData.googleSaveUrl || passData.saveUrl || '';
    }

    // 3. Save mapping in Supabase
    const { error: insertErr } = await supabase.from('loyalty_cards')->insert([{
      client_name: name,
      client_email: cleanEmail,
      client_phone: cleanPhone,
      pass_serial: serialNumber,
      stamps_count: 0,
      apple_pass_url: appleUrl,
      google_pass_url: googleUrl
    }]);

    if (insertErr) throw insertErr;

    // 4. Automated Welcome Email Delivery via Resend
    if (process.env.RESEND_API_KEY) {
      await sendWelcomeEmail(name, cleanEmail, appleUrl, googleUrl);
    }

    return NextResponse.json({ 
      success: true, 
      applePassUrl: appleUrl, 
      googlePassUrl: googleUrl 
    });

  } catch (err: any) {
    console.error('Loyalty Signup Error:', err);
    return NextResponse.json({ error: err.message || 'internal server error' }, { status: 500 });
  }
}

async function sendWelcomeEmail(name: string, email: string, appleUrl: string, googleUrl: string) {
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
            ${appleUrl ? `<a href="${appleUrl}" style="background-color:#000000; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:50px; font-size:12px; font-weight:bold; display:inline-block; margin-right:10px; text-transform:uppercase;">add to apple wallet</a>` : ''}
            ${googleUrl ? `<a href="${googleUrl}" style="background-color:#693F00; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:50px; font-size:12px; font-weight:bold; display:inline-block; text-transform:uppercase;">save to google wallet</a>` : ''}
          </div>

          <p style="font-size:12px; color:#6b7280; margin-top:30px; border-top:1px solid #E5E7EB; padding-top:15px; text-transform:lowercase;">collect 8 stamps to unlock 50% off on your 9th visit!</p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error('Failed to send loyalty welcome email:', emailErr);
  }
}