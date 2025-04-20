import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';

/**
 * Initialise un compte administrateur si nécessaire.
 * Les identifiants sont lus dans les variables :
 *   - ADMIN_USERNAME
 *   - ADMIN_PASSWORD
 */
@Injectable()
export class AdminSeed implements OnModuleInit {
  private readonly logger = new Logger(AdminSeed.name);

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
  ) {}

  async onModuleInit() {
    const username = this.config.get<string>('ADMIN_USERNAME');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    // Aucune variable => on ne crée pas d’admin implicite
    if (!username || !password) {
      this.logger.warn(
        'ADMIN_USERNAME / ADMIN_PASSWORD non définis : aucun compte admin créé.',
      );
      return;
    }

    const existing = await this.userService.findByUsername(username);

    if (!existing) {
      await this.userService.createUser(username, password, 'admin');
      this.logger.log(`Compte admin « ${username} » créé.`);
    } else if (existing.role !== 'admin') {
      await this.userService.updateUserRole(existing.id, 'admin');
      this.logger.log(`Compte « ${username} » promu au rôle admin.`);
    } else {
      this.logger.debug(`Compte admin « ${username} » déjà présent.`);
    }
  }
}
