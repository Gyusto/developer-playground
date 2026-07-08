import { createHmac } from 'crypto';

/**
 * Compute the outbound signature header for a rendered webhook payload.
 *
 *  - HMAC_SHA256   -> header `X-Signature`, hex HMAC-SHA256 of the body string.
 *  - CUSTOM_HEADER -> header `X-Webhook-Secret`, the raw decrypted secret.
 *  - NONE (or anything else) -> null (no signature header).
 */
export function signPayload(
  signatureType: string,
  decryptedSecret: string,
  bodyString: string,
): { header: string; value: string } | null {
  if (signatureType === 'HMAC_SHA256') {
    const value = createHmac('sha256', decryptedSecret).update(bodyString).digest('hex');
    return { header: 'X-Signature', value };
  }
  if (signatureType === 'CUSTOM_HEADER') {
    return { header: 'X-Webhook-Secret', value: decryptedSecret };
  }
  return null;
}
