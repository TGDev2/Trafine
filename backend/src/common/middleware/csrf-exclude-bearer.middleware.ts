import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as csrf from 'csurf';

/**
 * CSRF middleware configuré en cookie-to-header.
 * On l'applique partout SAUF :
 *   • pour les routes publiques d'authentification (login, register, refresh, logout, oauth)
 *   • pour toute requête déjà authentifiée par un Bearer token (API / WebSocket)
 *   • pour les méthodes non mutatives (GET|HEAD|OPTIONS) – déjà géré par csurf.
 */
@Injectable()
export class CsrfExcludeBearerMiddleware implements NestMiddleware {
  private static readonly csrfProtection = csrf({ cookie: true });

  /** Routes à exclure explicitement (prefix matching) */
  private static readonly AUTH_WHITELIST: readonly string[] = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
    '/auth/google',
    '/auth/google/callback',
    '/auth/twitter',
    '/auth/twitter/callback',
  ];

  private static isWhitelisted(path: string): boolean {
    return this.AUTH_WHITELIST.some((p) => path.startsWith(p));
  }

  private static hasBearer(req: Request): boolean {
    const auth = req.headers['authorization'];
    return typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ');
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (
      CsrfExcludeBearerMiddleware.isWhitelisted(req.path) ||
      CsrfExcludeBearerMiddleware.hasBearer(req)
    ) {
      return next();
    }
    // Pour toutes les autres requêtes mutatives, on applique la protection CSRF
    return CsrfExcludeBearerMiddleware.csrfProtection(req, res, next);
  }

  public createMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      return this.use(req, res, next);
    };
  }
}
