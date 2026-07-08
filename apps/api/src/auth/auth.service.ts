import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from '@developer-playground/validation';
import type { JwtPayload } from '@developer-playground/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '../config/config.service';

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'workspace'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  private sign(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwt.sign(payload, {
      secret: this.config.jwtSecret,
      expiresIn: this.config.jwtExpiresIn,
    });
  }

  /**
   * Register a new portal user. Creates the User, a personal Workspace, and an
   * OWNER WorkspaceMember in one transaction.
   */
  async register(dto: RegisterDto) {
    const existing = await this.db.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const workspaceName = dto.workspaceName ?? `${dto.name}'s Workspace`;

    // Ensure a unique workspace slug.
    let slug = slugify(workspaceName);
    let suffix = 1;
    while (await this.db.workspace.findUnique({ where: { slug } })) {
      slug = `${slugify(workspaceName)}-${suffix++}`;
    }

    const user = await this.db.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        memberships: {
          create: {
            role: 'OWNER',
            workspace: { create: { name: workspaceName, slug } },
          },
        },
      },
      include: { memberships: { include: { workspace: true } } },
    });

    const token = this.sign(user.id, user.email);
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
      workspace: user.memberships[0]?.workspace
        ? {
            id: user.memberships[0].workspace.id,
            name: user.memberships[0].workspace.name,
            slug: user.memberships[0].workspace.slug,
          }
        : null,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const token = this.sign(user.id, user.email);
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  /**
   * Forgot-password stub. In a full build this would generate a signed reset
   * token and email it. Here we return a generic acknowledgement (no user
   * enumeration) and, in non-production, echo a token for testing.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.db.user.findUnique({ where: { email: dto.email } });
    let resetToken: string | undefined;
    if (user && this.config.nodeEnv !== 'production') {
      resetToken = this.jwt.sign(
        { sub: user.id, email: user.email, purpose: 'password-reset' },
        { secret: this.config.jwtSecret, expiresIn: '30m' },
      );
    }
    return {
      message: 'If an account exists, a reset link has been sent.',
      resetToken,
    };
  }

  /** Reset-password stub — verifies the signed token then updates the hash. */
  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub: string; purpose?: string };
    try {
      payload = this.jwt.verify(dto.token, { secret: this.config.jwtSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    if (payload.purpose !== 'password-reset') {
      throw new UnauthorizedException('Invalid reset token');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.db.user.update({
      where: { id: payload.sub },
      data: { passwordHash },
    });
    return { message: 'Password updated' };
  }
}
