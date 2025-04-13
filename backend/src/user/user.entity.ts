import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  // Mot de passe haché (bcrypt). Pour les utilisateurs OAuth, une valeur dummy sera stockée.
  @Column()
  password!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  oauthProvider?: string;

  @Column({ nullable: true })
  oauthId?: string;

  // Exemple de champ pour stocker le rôle ou d’autres informations
  @Column({ default: 'user' })
  role!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
