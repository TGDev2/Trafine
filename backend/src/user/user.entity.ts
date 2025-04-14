import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EncryptionTransformer } from '../utils/encryption.transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  // Mot de passe haché (bcrypt)
  @Column()
  password!: string;

  // L'email est chiffré pour protéger la donnée sensible
  @Column({ nullable: true, transformer: EncryptionTransformer })
  email?: string;

  // Les informations OAuth sont également chiffrées
  @Column({ nullable: true, transformer: EncryptionTransformer })
  oauthProvider?: string;

  @Column({ nullable: true, transformer: EncryptionTransformer })
  oauthId?: string;

  // Exemple de champ pour stocker le rôle ou d’autres informations
  @Column({ default: 'user' })
  role!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
