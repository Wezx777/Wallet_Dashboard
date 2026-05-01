import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyMessage } from 'ethers';

export async function POST(request: Request) {
  try {
    const { address, signature, nonce } = await request.json();

    if (!address || !signature || !nonce) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const secret = process.env.WEB3_NONCE_SECRET;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret || !serviceRoleKey || serviceRoleKey === 'your-service-role-key-here') {
      return NextResponse.json({ error: 'MetaMask auth not configured on this server' }, { status: 503 });
    }

    // Verify HMAC nonce
    const parts = nonce.split(':');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid nonce format' }, { status: 400 });
    }
    const [ts, random, hmac] = parts;
    const raw = `${ts}:${random}`;
    const expectedHmac = createHmac('sha256', secret).update(raw).digest('hex');

    if (hmac !== expectedHmac) {
      return NextResponse.json({ error: 'Invalid nonce' }, { status: 400 });
    }

    // Check nonce freshness (5 minutes)
    if (Date.now() - parseInt(ts) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Nonce expired, please try again' }, { status: 400 });
    }

    // Verify Ethereum signature
    const message = `Sign this message to authenticate with Wallet Dashboard:\n\nNonce: ${nonce}`;
    let recoveredAddress: string;
    try {
      recoveredAddress = verifyMessage(message, signature);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Signature does not match address' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const email = `${address.toLowerCase()}@metamask.wallet`;

    // Create user if not exists (ignore duplicate error)
    await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        wallet_address: address,
        auth_method: 'metamask',
        display_name: `${address.slice(0, 6)}...${address.slice(-4)}`,
      },
    });

    // Generate one-time login link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData) {
      return NextResponse.json({ error: 'Failed to generate auth token' }, { status: 500 });
    }

    const linkUrl = new URL(linkData.properties.action_link);
    const tokenHash = linkUrl.searchParams.get('token_hash');

    return NextResponse.json({ token_hash: tokenHash, type: 'magiclink' });
  } catch (err) {
    console.error('Web3 auth error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
