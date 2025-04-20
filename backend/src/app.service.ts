import { Injectable } from '@nestjs/common';

/**
 * Service applicatif minimal. Conserve un point d’entrée unique pour le
 * message de bienvenue, de sorte que les tests et le contrôleur restent
 * synchronisés même si le contenu évolue.
 */
@Injectable()
export class AppService {
  getHello(): string {
    return 'Bienvenue sur Trafine API!';
  }
}
