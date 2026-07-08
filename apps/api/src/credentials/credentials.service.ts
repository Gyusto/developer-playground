import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import type { CreateCredentialDto } from '@developer-playground/validation';
import type { AuthType, GeneratedCredentialSecret } from '@developer-playground/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { AuditService } from '../audit-logs/audit.service';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  private generateToken(): string {
    return `sandbox_key_${randomBytes(18).toString('hex')}`;
  }

  /** Create a credential and return the plaintext secret exactly once. */
  async create(
    userId: string,
    environmentId: string,
    workspaceId: string,
    dto: CreateCredentialDto,
  ): Promise<GeneratedCredentialSecret> {
    const type: AuthType = dto.type ?? 'API_KEY';
    const token = this.generateToken();
    const keyPrefix = token.slice(0, 20);

    const data: {
      environmentId: string;
      name: string;
      type: AuthType;
      keyPrefix?: string;
      secretHash?: string;
      encryptedSecret?: string;
      username?: string;
    } = {
      environmentId,
      name: dto.name,
      type,
      keyPrefix,
    };

    if (type === 'HMAC') {
      // HMAC secrets must be recoverable to verify signatures, so store encrypted.
      data.encryptedSecret = this.crypto.encrypt(token);
    } else {
      // API_KEY / BEARER / BASIC: store only a hash for verification.
      data.secretHash = await bcrypt.hash(token, 10);
      if (type === 'BASIC' && dto.username) data.username = dto.username;
    }

    const cred = await this.db.apiCredential.create({ data });

    await this.audit.record({
      workspaceId,
      userId,
      action: 'CREATE',
      entityType: 'ApiCredential',
      entityId: cred.id,
      metadata: { name: cred.name, type },
    });

    return { id: cred.id, name: cred.name, secret: token, keyPrefix };
  }

  async listForEnvironment(environmentId: string) {
    const creds = await this.db.apiCredential.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'desc' },
    });
    // Never expose secretHash / encryptedSecret.
    return creds.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      keyPrefix: c.keyPrefix,
      username: c.username,
      status: c.status,
      lastUsedAt: c.lastUsedAt,
      createdAt: c.createdAt,
      revokedAt: c.revokedAt,
    }));
  }

  /** Rotate: issue a new secret, invalidate the old value. Returns plaintext once. */
  async rotate(
    userId: string,
    id: string,
    workspaceId: string,
  ): Promise<GeneratedCredentialSecret> {
    const cred = await this.db.apiCredential.findUnique({ where: { id } });
    if (!cred) throw new NotFoundException('Credential not found');

    const token = this.generateToken();
    const keyPrefix = token.slice(0, 20);

    await this.db.apiCredential.update({
      where: { id },
      data:
        cred.type === 'HMAC'
          ? {
              keyPrefix,
              encryptedSecret: this.crypto.encrypt(token),
              status: 'ACTIVE',
              revokedAt: null,
            }
          : {
              keyPrefix,
              secretHash: await bcrypt.hash(token, 10),
              status: 'ACTIVE',
              revokedAt: null,
            },
    });

    await this.audit.record({
      workspaceId,
      userId,
      action: 'ROTATE',
      entityType: 'ApiCredential',
      entityId: id,
    });

    return { id, name: cred.name, secret: token, keyPrefix };
  }

  /** Revoke: credential can no longer authenticate runtime requests. */
  async revoke(userId: string, id: string, workspaceId: string) {
    const cred = await this.db.apiCredential.findUnique({ where: { id } });
    if (!cred) throw new NotFoundException('Credential not found');

    await this.db.apiCredential.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    await this.audit.record({
      workspaceId,
      userId,
      action: 'REVOKE',
      entityType: 'ApiCredential',
      entityId: id,
    });
    return { revoked: true };
  }
}
