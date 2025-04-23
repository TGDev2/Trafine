import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Intercepte uniquement l’erreur « invalid csrf token » levée par csurf
 * et renvoie une réponse JSON compréhensible par le front.
 */
@Catch(ForbiddenException)
export class CsrfExceptionFilter implements ExceptionFilter {
  catch(exception: ForbiddenException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const detail =
      (exception.getResponse() as any)?.message ?? exception.message;

    if (detail === 'invalid csrf token') {
      return res.status(403).json({
        statusCode: 403,
        timestamp: new Date().toISOString(),
        path: req.url,
        message: 'Invalid CSRF token',
      });
    }

    // Laisse les autres ForbiddenException être traitées par le filtre global
    throw exception;
  }
}
