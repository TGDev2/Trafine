import {
  Injectable,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { toDataURL } from 'qrcode';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  RouteCalculationStrategy,
  RouteResult,
} from './route-calculation.strategy';
import { ShareableRoute } from './entities/shareable-route.entity';

@Injectable()
export class NavigationService {
  constructor(
    @Inject('RouteCalculationStrategy')
    private readonly routeCalculationStrategy: RouteCalculationStrategy,

    @InjectRepository(ShareableRoute)
    private readonly shareRepo: Repository<ShareableRoute>,

    private readonly config: ConfigService,
  ) {}

  /**
   * Renvoie les itinéraires proposés sous forme d’un tableau d’alternatives.
   */
  async calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<{ routes: RouteResult[] }> {
    return await this.routeCalculationStrategy.calculateRoute(
      source,
      destination,
      options,
    );
  }

  /**
   * Génère un QR code pointant vers un lien de partage pour le trajet donné.
   * Retourne à la fois la DataURL du QR et l'ID de partage.
   */
  async generateRouteQRCode(
    route: any,
  ): Promise<{ qrDataUrl: string; shareId: string }> {
    // 1) Persister le trajet
    const shareable = this.shareRepo.create({ route });
    await this.shareRepo.save(shareable);

    // 2) Construire l'URL de partage
    const baseUrl = this.config.get<string>(
      'APP_BASE_URL',
      'https://app.trafine.com',
    );
    const shareUrl = `${baseUrl}/share/${shareable.id}`;

    // 3) Générer le QR code sur l'URL
    try {
      const qrDataUrl = await toDataURL(shareUrl);
      return { qrDataUrl, shareId: shareable.id };
    } catch (err: any) {
      throw new InternalServerErrorException(
        `La génération du QR code a échoué : ${err.message}`,
      );
    }
  }
}
