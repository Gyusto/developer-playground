import { Injectable } from '@nestjs/common';
import { renderTemplate, type RenderContext } from '@developer-playground/template-engine';

/** Thin injectable wrapper around @developer-playground/template-engine (spec section 7). */
@Injectable()
export class TemplateRendererService {
  render<T = unknown>(
    input: string | object | null | undefined,
    ctx: RenderContext,
  ): T {
    return renderTemplate<T>(input, ctx);
  }
}
