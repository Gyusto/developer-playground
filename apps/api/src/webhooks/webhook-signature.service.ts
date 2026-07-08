import { Injectable } from '@nestjs/common';
import type { SignatureType } from '@developer-playground/shared-types';
import { CryptoService } from '../common/crypto/crypto.service';

export interface SignatureHeader {
  header: string;
  value: string;
}

/**
 * Produces the outbound webhook signature header (spec section 8.1).
 * HMAC_SHA256 -> `X-Signature: <hex hmac of body>`; CUSTOM_HEADER -> raw secret.
 * (The worker signs at delivery time; this service is used for previews/tests.)
 */
@Injectable()
export class WebhookSignatureService {
  constructor(private readonly crypto: CryptoService) {}

  sign(
    signatureType: SignatureType,
    encryptedSecret: string | null | undefined,
    body: string,
  ): SignatureHeader | null {
    if (signatureType === 'NONE' || !encryptedSecret) return null;
    const secret = this.crypto.decrypt(encryptedSecret);
    if (signatureType === 'HMAC_SHA256') {
      return { header: 'X-Signature', value: this.crypto.hmacSha256Hex(secret, body) };
    }
    if (signatureType === 'CUSTOM_HEADER') {
      return { header: 'X-Webhook-Secret', value: secret };
    }
    return null;
  }
}
