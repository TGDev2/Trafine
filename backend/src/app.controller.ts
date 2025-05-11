import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Contrôleur racine : expose un message de bienvenue et sert de vérification
 * rapide pour des sondes HTTP ou des tests de smoke.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  /**
   * GET /
   * @returns Chaîne de bienvenue générique.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
