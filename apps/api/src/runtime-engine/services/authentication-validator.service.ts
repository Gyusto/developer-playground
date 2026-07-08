import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { ApiCredential } from '@developer-playground/database';
import type { AuthType } from '@developer-playground/shared-types';
import { CryptoService } from '../../common/crypto/crypto.service';

export interface AuthResult {
  ok: boolean;
  credentialId?: string;
  message?: string;
}

interface AuthInput {
  authType: AuthType;
  headers: Record<string, string>;
  rawBody: string;
  credentials: ApiCredential[];
}

/** Validates runtime request authentication (spec section 4 step 5, section 15). */
@Injectable()
export class AuthenticationValidatorService {
  constructor(private readonly crypto: CryptoService) {}

  private header(headers: Record<string, string>, name: string): string | undefined {
    const target = name.toLowerCase();
    const key = Object.keys(headers).find((h) => h.toLowerCase() === target);
    return key ? headers[key] : undefined;
  }

  async validate(input: AuthInput): Promise<AuthResult> {
    const { authType, headers, rawBody, credentials } = input;

    if (authType === 'NONE') return { ok: true };

    const active = credentials.filter((c) => c.status === 'ACTIVE');

    if (authType === 'API_KEY') {
      const provided = this.header(headers, 'X-API-Key');
      if (!provided) return { ok: false, message: 'Missing X-API-Key header' };
      return this.matchHashed(provided, active, 'API_KEY');
    }

    if (authType === 'BEARER') {
      const auth = this.header(headers, 'Authorization') ?? '';
      const token = auth.replace(/^Bearer\s+/i, '').trim();
      if (!token) return { ok: false, message: 'Missing bearer token' };
      return this.matchHashed(token, active, 'BEARER');
    }

    if (authType === 'BASIC') {
      const auth = this.header(headers, 'Authorization') ?? '';
      const b64 = auth.replace(/^Basic\s+/i, '').trim();
      if (!b64) return { ok: false, message: 'Missing basic credentials' };
      let decoded: string;
      try {
        decoded = Buffer.from(b64, 'base64').toString('utf8');
      } catch {
        return { ok: false, message: 'Malformed basic credentials' };
      }
      const idx = decoded.indexOf(':');
      const username = idx >= 0 ? decoded.slice(0, idx) : decoded;
      const password = idx >= 0 ? decoded.slice(idx + 1) : '';
      for (const cred of active) {
        if (cred.type !== 'BASIC' || cred.username !== username) continue;
        if (cred.secretHash && (await bcrypt.compare(password, cred.secretHash))) {
          return { ok: true, credentialId: cred.id };
        }
      }
      return { ok: false, message: 'Invalid basic credentials' };
    }

    if (authType === 'HMAC') {
      const signature = this.header(headers, 'X-Signature');
      if (!signature) return { ok: false, message: 'Missing X-Signature header' };
      for (const cred of active) {
        if (cred.type !== 'HMAC' || !cred.encryptedSecret) continue;
        try {
          const secret = this.crypto.decrypt(cred.encryptedSecret);
          const expected = this.crypto.hmacSha256Hex(secret, rawBody);
          if (timingSafeEq(expected, signature)) {
            return { ok: true, credentialId: cred.id };
          }
        } catch {
          // ignore malformed secret and keep checking
        }
      }
      return { ok: false, message: 'Invalid HMAC signature' };
    }

    return { ok: false, message: 'Unsupported auth type' };
  }

  private async matchHashed(
    provided: string,
    credentials: ApiCredential[],
    type: AuthType,
  ): Promise<AuthResult> {
    for (const cred of credentials) {
      if (cred.type !== type || !cred.secretHash) continue;
      if (await bcrypt.compare(provided, cred.secretHash)) {
        return { ok: true, credentialId: cred.id };
      }
    }
    return { ok: false, message: 'Invalid credentials' };
  }
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
