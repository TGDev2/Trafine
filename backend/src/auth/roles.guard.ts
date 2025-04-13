import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      // Aucun rôle requis, accès autorisé
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    // On vérifie si le rôle de l’utilisateur est compris dans les rôles requis
    return user && requiredRoles.includes(user.role);
  }
}
