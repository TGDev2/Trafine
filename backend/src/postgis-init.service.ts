import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Garantit :
 *  1. l’activation de l’extension PostGIS ;
 *  2. la présence d’un index GIST sur `incident.location`
 *     (primordial pour ST_DWithin / ST_Distance).
 *
 * Le service s’exécute après la synchronisation TypeORM,
 * donc la table <incident> existe déjà.
 */
@Injectable()
export class PostgisInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PostgisInitService.name);

  constructor(private readonly dataSource: DataSource) { }

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS postgis;');
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS "idx_incident_location"
           ON "incident" USING GIST ("location");`,
      );
      this.logger.log('PostGIS prêt ; index spatial vérifié ✅');
    } catch (err) {
      this.logger.error('PostGIS initialisation failed', err as Error);
      // On ne lève pas l’erreur pour ne pas empêcher le démarrage,
      // mais on log le problème afin qu’il soit visible.
    }
  }
}
