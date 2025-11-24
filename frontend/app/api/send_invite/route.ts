import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Lazy initialization of Resend client (only when route is called, not during build)
function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(apiKey);
}

// Generate random alphanumeric code of length 10 in uppercase
function generateSecretCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, party_type } = body;

    // Validate input
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (party_type !== 'main party' && party_type !== 'after party') {
      return NextResponse.json(
        { error: 'Invalid party type. Must be "main party" or "after party"' },
        { status: 400 }
      );
    }

    // Generate secret code
    const secretCode = generateSecretCode();

    // Prepare email content
    const subject = `invitation to "${party_type}"`;
    const emailBody = `hey buddy, it is me Walrus!\r\nyou are invited to my "${party_type}". your secret code is #${secretCode}!\r\nGet this verified on https://aver.email to access the secret vault!`;

    // Initialize Resend client (lazy, only when route is called)
    let resend: Resend;
    try {
      resend = getResendClient();
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'RESEND_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: subject,
      text: emailBody,
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json(
        { error: `Failed to send email: ${error.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent successfully to ${email}`,
      secret_code: secretCode,
      email_id: data?.id,
    });
  } catch (error: any) {
    console.error('Error sending invite:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

