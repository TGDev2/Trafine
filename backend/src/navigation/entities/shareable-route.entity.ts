import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'shareable_routes' })
export class ShareableRoute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('json')
  route!: any;

  @CreateDateColumn()
  createdAt!: Date;
}
