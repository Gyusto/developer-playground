import { Injectable } from '@nestjs/common';

/**
 * Central typed access to environment configuration.
 * Reads from process.env (dotenv is loaded in main.ts before the app boots).
 */
@Injectable()
export class ConfigService {
  private env(key: string, fallback?: string): string {
    const value = process.env[key];
    if (value === undefined || value === '') {
      if (fallback !== undefined) return fallback;
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  private optional(key: string, fallback = ''): string {
    return process.env[key] ?? fallback;
  }

  get apiPort(): number {
    return Number(this.optional('API_PORT', '4000'));
  }

  get jwtSecret(): string {
    return this.env('PORTAL_JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.optional('PORTAL_JWT_EXPIRES_IN', '1d');
  }

  get credentialEncryptionKey(): string {
    return this.env('CREDENTIAL_ENCRYPTION_KEY');
  }

  get publicBaseUrl(): string {
    return this.optional('PUBLIC_BASE_URL', 'http://localhost:4000');
  }

  get webhookAllowedPrivateCidrs(): string[] {
    return this.optional('WEBHOOK_ALLOWED_PRIVATE_CIDRS', '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }

  get maxJsonBodyBytes(): number {
    return Number(this.optional('MAX_JSON_BODY_BYTES', '1048576'));
  }

  get redisHost(): string {
    return this.optional('REDIS_HOST', 'localhost');
  }

  get redisPort(): number {
    return Number(this.optional('REDIS_PORT', '6379'));
  }

  get corsOrigins(): string[] | boolean {
    const raw = this.optional('CORS_ORIGINS', '');
    if (!raw) return true; // reflect request origin in dev
    return raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }

  get nodeEnv(): string {
    return this.optional('NODE_ENV', 'development');
  }
}
