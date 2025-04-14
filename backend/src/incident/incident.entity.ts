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

  // Nouvelle colonne géospatiale pour stocker la localisation de l'incident.
  // La valeur par défaut est définie pour les enregistrements existants afin d'éviter les valeurs nulles.
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: false,
    default: () => "ST_SetSRID(ST_MakePoint(0, 0),4326)",
  })
  location!: { type: 'Point'; coordinates: number[] };

  // Accesseurs pour obtenir la latitude et la longitude depuis la donnée géospatiale
  get latitude(): number {
    return this.location.coordinates[1];
  }

  get longitude(): number {
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
}
