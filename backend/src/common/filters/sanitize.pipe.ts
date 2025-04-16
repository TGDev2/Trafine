import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { sanitize } from 'class-sanitizer';

/**
 * Pipe global pour nettoyer tous les DTO via class-sanitizer.
 * Chaque champ marqué avec les décorateurs appropriés sera purgé
 * ou échappé afin de prévenir les attaques XSS.
 */
@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    // Ne traite que les DTO (type 'body', 'query', etc.); on peut affiner au besoin
    if (!value || !metadata.metatype || typeof value !== 'object') {
      return value;
    }

    // Convertit la valeur brute en instance de la classe, puis exécute la sanitization
    const instance = plainToInstance(metadata.metatype, value);
    sanitize(instance);

    // On retourne l’objet transformé sous forme simple (plain)
    return instance;
  }
}
