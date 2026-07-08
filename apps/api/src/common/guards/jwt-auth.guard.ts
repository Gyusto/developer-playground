import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guards portal routes with the JWT bearer strategy. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
