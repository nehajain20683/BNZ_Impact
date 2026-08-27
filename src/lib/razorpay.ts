// src/lib/razorpay.ts
// Note: Razorpay SDK only runs in Node.js runtime (not Edge).
// All payment API routes must use: export const runtime = 'nodejs'
import Razorpay from 'razorpay';
import crypto from 'crypto';

export type RazorpayCreds = { keyId?: string | null; keySecret?: string | null };

let _platformRazorpay: Razorpay | null = null;

// Returns a Razorpay client using the given org's own credentials if it has
// them configured, otherwise falls back to the platform-wide env credentials.
export function getRazorpay(creds?: RazorpayCreds): Razorpay {
  const keyId     = creds?.keyId     || process.env.RAZORPAY_KEY_ID;
  const keySecret = creds?.keySecret || process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set (platform env, or per-org via Super Admin)');
  }

  // Only cache the platform-wide default client; per-org overrides are cheap
  // to construct (no network call) so we don't bother caching those.
  const usingOrgCreds = !!(creds?.keyId || creds?.keySecret);
  if (!usingOrgCreds) {
    if (!_platformRazorpay) _platformRazorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return _platformRazorpay;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function createOrder(amount: number, receipt: string, orgSlug?: string, creds?: RazorpayCreds) {
  return getRazorpay(creds).orders.create({
    amount: Math.round(amount * 100), // convert to paise
    currency: 'INR',
    receipt,
    notes: { platform: 'BNZImpact', org: orgSlug || 'unknown' },
  });
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret?: string | null
): boolean {
  const secret = keySecret || process.env.RAZORPAY_KEY_SECRET!;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === signature;
}

export function verifyWebhookSignature(body: string, signature: string, webhookSecret?: string | null): boolean {
  const secret = webhookSecret || process.env.RAZORPAY_KEY_SECRET!;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === signature;
}
