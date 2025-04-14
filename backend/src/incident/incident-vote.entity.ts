import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { Incident } from './incident.entity';
import { User } from '../user/user.entity';

export enum VoteType {
  CONFIRM = 'confirm',
  DENY = 'deny',
}

@Entity()
@Unique(['incident', 'userId'])
export class IncidentVote {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Incident, (incident) => incident.votes, {
    onDelete: 'CASCADE',
  })
  incident!: Incident;

  @Column()
  userId!: number;

  @Column({
    type: 'enum',
    enum: VoteType,
  })
  vote!: VoteType;

  @CreateDateColumn()
  createdAt!: Date;
}
