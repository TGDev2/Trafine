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

  // Coordonnées géographiques
  @Column({ type: 'float', nullable: true })
  latitude!: number;

  @Column({ type: 'float', nullable: true })
  longitude!: number;

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
