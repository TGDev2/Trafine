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

  @Column()
  password!: string;

  @Column({ nullable: true, transformer: EncryptionTransformer })
  email?: string;

  @Column({ nullable: true, transformer: EncryptionTransformer })
  oauthProvider?: string;

  @Column({ nullable: true, transformer: EncryptionTransformer })
  oauthId?: string;

  @Column({ default: 'user' })
  role!: string;

  /** ------------------------------------------------------------------
   *  Jeton d’actualisation (hashé) — permet la révocation serveur‑side
   *  ------------------------------------------------------------------ */
  @Column({ nullable: true })
  refreshTokenHash?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
