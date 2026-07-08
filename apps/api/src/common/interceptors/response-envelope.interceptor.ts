import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiResponseEnvelope } from '@developer-playground/shared-types';

/**
 * Wraps every portal controller return value in a standard success envelope.
 * Runtime + webhook-receiver controllers use @Res() passthrough and therefore
 * bypass this interceptor (they must return raw provider-shaped responses).
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T>
  implements NestInterceptor<T, ApiResponseEnvelope<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseEnvelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data ?? null,
      })),
    );
  }
}
