import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Properly format the private key lines for Node.js OpenSSL 3
const cleanPrivateKey = [
  '-----BEGIN PRIVATE KEY-----',
  'MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDLu9Qct9lbSoET',
  'NAb8bapNC7P6mzylklFEFvmG2fHnbsEkAmy1d8fuNcBrSmJCrkKz0guTWHlvwUyQ',
  'QSsKooFURB8Dc1iR1N4+JdgHcJVx+CF254VxX7mvHZPJ+5jF+Mo8NUdKrP+oc7JI',
  '1H2sMJGc12yRUigd4OuF0nRhb8w0Kq4AkTGsR2+9UD+3lmDJBCt37m6wiEJ0GPex',
  's9gEJQLVpUlEnMi1FGH3LYpnUM8Evg8ocimmCy0sq53h15n4DzKoMXE74PNoigAk',
  'ZzQdH+KLz6BNgTO3BcN1u/YlEaLYLq6yeDHFfhK4bnARKD9J+CLP3NvpqeJzARWA',
  '5ZB49kl3AgMBAAECggEAWj3vfWz+DQ7aT4w7D/LvfUMSzI2YdmpyLqvSiSXenbmU',
  'OYQNbPAKkfwjKCMBlTGlAAuo7vJAj/zaEgebrhE/Ifkul5OvBqF4c6TFpL38pEfZ',
  'Yta4Z/iTwfpi7RPRntdNlQ+wbWZls9LThKkCpZO52/Qb9d6jQGDRUixfOo2PsQbw',
  'Ar6vTiRQA4vHfB7QFUdIUtBTWMWj+Ff537rwjkergUSBiyuTQN+G+rDO+BvDQtsm',
  'Qw4BY3Q8e0lgHAyTG27C2Fiy4cXH8lUGBobFHL/ZGrY3hAzE+kHfsHqJbfHa1Qai',
  'kTncHBi3z6tLHui1UnVwzJGHhlphwuoaS70oNAplkQKBgQDw6JW/dlV+Y38OTZOH',
  'lCyLSORFa0M/LjPYccxpxSmYZhpUuWREHrLHbC0ugOt5PXOeEEtPSc+gzGD8uZs+',
  'p9xuOJonLJfTWn0WEjx4s855QabG79bWk07XvV7AkCts/m26hYV/JScun7T9If9Q',
  '77UEIni8SNdIz98zAt7mGyUnmQKBgQDYfxOHnYriojHR6qOYXHh5h73wbsnX5MY+',
  '4pgjeoP+cQ89CXXbhxdpplmrbakT3I7bUstRrtdgZHAGw2Vc0jtxSqc2xxkizirl',
  'Hmi/s5lNnIhoQQdHMrv07sPcThUBNB/UZxzkgXLkMvESHriT8y6EVMb45/JkCwBB',
  'nxYrQsy1jjwKBgQCF6eQD7/WKMiiYfMr7XIR+UGCDriJNZpNvR6LHUM/UZT1Rx1RT',
  'AXWDoUBkT0mVtXEldg1G39LIoZNwKISBibHgmxolmIY0+GH7+NsghWLKyJG6l+um',
  'nj3AOQLgA9qMNDUlVm48fpDlpk2F6LIHOLdFDoR3YG+2ADf0WUAwzgPdgUQKBgQDL',
  'o7RuEt1J0kDEcE3Tid90iR87YiqP3cwv6JosfRhdJGGuCxEGHmsCYIvl+S9Z1FO3',
  'nr4g53BkQvUi2w+K7TbDGHu9sUhitqXmlrFXhRAFGhJ+2WLyM1wb/G/u1ZOjTCgGK',
  'nnDcMJUs5pUUmwyjhWZP+u3OxOxO/0K08MKEjL/bYtwKBgQDVV6fLKm8w+htHUWOP',
  'nyb5wCMpj8Pai0l4vLyohqf72Opb4/kM6oVIRaTEeARdl1CAwkuGzIO+7GagrGtFB',
  'nj9Dfy27RyrfxmPFuRIFdQkqQDoHJmszmY9Xt2Bk8XOjGzy2q87GTy1IweNdAIt09',
  'hh/H88tX69FphDOl1MtVLCdjNA==',
  '-----END PRIVATE KEY-----'
].join('\n');

async function syncToGoogleCalendar(bookingData: any) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: 'calendar-sync@calm-drift-sanctuary.iam.gserviceaccount.com',
      private_key: cleanPrivateKey,
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
    summary: `Sanctuary: ${bookingData.treatment_title} - ${bookingData.client_name}`,
    description: `Client Email: ${bookingData.client_email}\nPhone: ${bookingData.client_phone}\nNotes: ${bookingData.notes || 'None'}`,
    start: { dateTime: bookingData.start_time },
    end: { dateTime: bookingData.end_time },
  };

  const response = await calendar.events.insert({
    calendarId: 'calmdriftsanctuary@gmail.com',
    requestBody: event,
  });

  console.log('Successfully synced booking to Google Calendar:', response.data.htmlLink);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { treatmentId, clientName, clientEmail, clientPhone, startTime, durationMinutes, notes } = body;

    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + (durationMinutes || 60) * 60000);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        treatment_id: treatmentId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        notes: notes || '',
        status: 'confirmed'
      })
      .select('*, treatments(title)')
      .single();

    if (bookingError) throw bookingError;

    // Trigger Google Calendar Sync
    await syncToGoogleCalendar({
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      treatment_title: booking.treatments?.title || 'Holistic Treatment',
      notes,
    });

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    console.error('GOOGLE CALENDAR SYNC ERROR DETAIL:', err.message || err);
    return NextResponse.json({ error: err.message || 'Booking failed' }, { status: 500 });
  }
}