import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { decryptSecret, encryptSecret } from './crypto.util';

/** Injectable wrapper around the AES-GCM helpers + HMAC signing. */
@Injectable()
export class CryptoService {
  encrypt(plaintext: string): string {
    return encryptSecret(plaintext);
  }

  decrypt(payload: string): string {
    return decryptSecret(payload);
  }

  hmacSha256Hex(secret: string, body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }
}
