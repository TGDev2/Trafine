import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Incident {
  @PrimaryGeneratedColumn()
  id: number;

  // Type d'incident (ex. accident, embouteillage, route fermée, contrôle policier, obstacle)
  @Column()
  type: string;

  // Description optionnelle de l'incident
  @Column({ nullable: true })
  description: string;

  // Coordonnées géographiques
  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  // Indique si l'incident a été confirmé par d'autres utilisateurs
  @Column({ default: false })
  confirmed: boolean;

  // Date de création de l'incident
  @CreateDateColumn()
  createdAt: Date;
}
