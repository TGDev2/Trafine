import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { IncidentVote } from './incident-vote.entity';

@Entity()
export class Incident {
  @PrimaryGeneratedColumn()
  id!: number;

  // Type d'incident (ex. accident, embouteillage, route fermée, contrôle policier, obstacle)
  @Column()
  type!: string;

  // Description optionnelle de l'incident
  @Column({ nullable: true })
  description!: string;

  // Colonne géospatiale pour stocker la localisation de l'incident.
  // La valeur par défaut est définie pour les enregistrements existants afin d'éviter les valeurs nulles.
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: false,
    default: () => 'ST_SetSRID(ST_MakePoint(0, 0),4326)',
  })
  location!: { type: 'Point'; coordinates: number[] };

  // Accesseurs pour obtenir la latitude et la longitude depuis la donnée géospatiale
  get latitude(): number {
    // Vérifier si les coordonnées existent avant d'accéder à l'index 1
    if (!this.location || !this.location.coordinates || !Array.isArray(this.location.coordinates) || this.location.coordinates.length < 2) {
      return 0; // Valeur par défaut
    }
    return this.location.coordinates[1];
  }

  get longitude(): number {
    // Vérifier si les coordonnées existent avant d'accéder à l'index 0
    if (!this.location || !this.location.coordinates || !Array.isArray(this.location.coordinates) || this.location.coordinates.length < 2) {
      return 0; // Valeur par défaut
    }
    return this.location.coordinates[0];
  }

  // Indique si l'incident a été validé ou infirmé, en fonction de l'agrégation des votes
  @Column({ default: false })
  confirmed!: boolean;

  @Column({ default: false })
  denied!: boolean;

  // Date de création de l'incident
  @CreateDateColumn()
  createdAt!: Date;

  // Relation avec les votes de validation/infirmation
  @OneToMany(() => IncidentVote, (vote) => vote.incident, { cascade: true })
  votes!: IncidentVote[];

  // Nouveau champ pour le statut de l'incident (active, expired, archived)
  @Column({ default: 'active' })
  status!: 'active' | 'expired' | 'archived';

  // Champ pour la date d'expiration de l'incident (si défini)
  @Column({ type: 'timestamptz', nullable: true })
  expirationDate!: Date | null;

  // Champ pour la dernière date de confirmation de l'incident
  @Column({ type: 'timestamptz', nullable: true })
  lastConfirmationDate!: Date | null;

  // Méthode utilitaire pour vérifier si l'incident est actif
  isActive(): boolean {
    return (
      this.status === 'active' &&
      (!this.expirationDate || this.expirationDate > new Date())
    );
  }
}
