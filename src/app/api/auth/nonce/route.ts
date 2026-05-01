import { createHmac, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';

export async function GET() {
  const secret = process.env.WEB3_NONCE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const random = randomBytes(16).toString('hex');
  const ts = Date.now().toString();
  const raw = `${ts}:${random}`;
  const hmac = createHmac('sha256', secret).update(raw).digest('hex');

  return NextResponse.json({ nonce: `${raw}:${hmac}` });
}
