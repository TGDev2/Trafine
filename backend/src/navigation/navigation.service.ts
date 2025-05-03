import {
  Injectable,
  InternalServerErrorException,
  Inject,
  NotFoundException,
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
    private readonly routeStrategy: RouteCalculationStrategy,
    @InjectRepository(ShareableRoute)
    private readonly shareRepo: Repository<ShareableRoute>,
    private readonly cfg: ConfigService,
  ) {}

  /* ---------- Calcul d’itinéraires ---------- */
  async calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<{ routes: RouteResult[] }> {
    return this.routeStrategy.calculateRoute(source, destination, options);
  }

  /* ---------- QR code & persistance ---------- */
  async generateRouteQRCode(
    routes: RouteResult[],
  ): Promise<{ qrDataUrl: string; shareId: string }> {
    const shareable = await this.shareRepo.save({ route: routes });

    const base = this.cfg.get<string>(
      'APP_BASE_URL',
      'https://app.trafine.com',
    );
    const shareUrl = `${base}/share/${shareable.id}`;

    try {
      return { qrDataUrl: await toDataURL(shareUrl), shareId: shareable.id };
    } catch (err: any) {
      throw new InternalServerErrorException(
        `La génération du QR code a échoué : ${err.message}`,
      );
    }
  }

  /* ---------- Récupération d’un partage ---------- */
  async getSharedRoute(id: string): Promise<RouteResult[]> {
    const rec = await this.shareRepo.findOne({ where: { id } });
    if (!rec)
      throw new NotFoundException(`Itinéraire partagé ${id} introuvable.`);
    return rec.route as RouteResult[];
  }
}
