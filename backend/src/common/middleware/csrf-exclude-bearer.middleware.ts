import { Request, Response, NextFunction } from 'express';
import * as csurf from 'csurf';

/**
 * CSRF middleware qui s’applique SEULEMENT lorsque la requête
 * *n’est pas* déjà authentifiée par un JWT Bearer.
 *
 * – Les appels web (cookie de session) restent protégés.
 * – Les appels mobiles (JWT dans le header Authorization) passent.
 */
const csrfProtection = csurf({ cookie: true });

export function csrfExcludeBearer(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    // Si un JWT est présent, on considère la requête comme stateless -> skip CSRF
    const hasBearer = req.headers.authorization?.startsWith('Bearer ');
    if (hasBearer) {
        return next();
    }
    return csrfProtection(req, res, next);
}
