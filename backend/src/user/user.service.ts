import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  /* ----------  Recherche & création  ---------- */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async createUser(
    username: string,
    plainPassword: string,
    role: string = 'user',
  ): Promise<User> {
    const existing = await this.findByUsername(username);
    if (existing) {
      throw new ConflictException('Le nom d’utilisateur est déjà utilisé.');
    }
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      role,
    });
    return this.userRepository.save(user);
  }

  async verifyPassword(user: User, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.password);
  }

  /* ----------  Gestion du refresh‑token  ---------- */
  async setRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(
      { id: userId },
      { refreshTokenHash: hash },
    );
  }

  async removeRefreshToken(userId: number): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      { refreshTokenHash: null },
    );
  }

  async findOrCreateOAuthUser(
    provider: string,
    oauthId: string,
    email?: string,
    displayName?: string,
  ): Promise<User> {
    // On recherche un compte déjà lié
    let user = await this.userRepository.findOne({
      where: { oauthProvider: provider, oauthId },
    });
    if (user) return user;

    // Génération d’un username de base
    const base = `${provider}_${oauthId}`;
    let username = base;
    let suffix = 0;

    // Si collision, on incrémente un suffixe jusqu’à trouver un username libre
    while (await this.findByUsername(username)) {
      suffix += 1;
      username = `${base}_${suffix}`;
    }

    // On crée un mot de passe aléatoire (jamais utilisé pour login local)
    const dummyPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(dummyPassword, 10);

    // Création et sauvegarde de l’utilisateur OAuth
    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
      oauthProvider: provider,
      oauthId,
      email,
      role: 'user',
    });
    return this.userRepository.save(newUser);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async updateUserRole(id: number, role: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with id ${id} not found.`);
    user.role = role;
    return this.userRepository.save(user);
  }
}