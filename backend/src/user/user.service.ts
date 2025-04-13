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
  ) {}

  /**
   * Recherche un utilisateur par son nom d’utilisateur.
   * @param username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  /**
   * Création d'un nouvel utilisateur avec hachage du mot de passe.
   * @param username
   * @param plainPassword
   */
  async createUser(username: string, plainPassword: string): Promise<User> {
    const existing = await this.findByUsername(username);
    if (existing) {
      throw new ConflictException('Le nom d’utilisateur est déjà utilisé.');
    }
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  /**
   * Vérifie le mot de passe fourni face au mot de passe haché de l’utilisateur.
   * @param user
   * @param plainPassword
   */
  async verifyPassword(user: User, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.password);
  }

  /**
   * Recherche un utilisateur basé sur les informations OAuth ou le crée s'il n'existe pas.
   * @param provider Fournisseur OAuth (google, facebook, etc.)
   * @param oauthId Identifiant de l'utilisateur fourni par OAuth
   * @param email Email de l'utilisateur (optionnel)
   * @param displayName Nom affiché (optionnel)
   */
  async findOrCreateOAuthUser(
    provider: string,
    oauthId: string,
    email?: string,
    displayName?: string,
  ): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { oauthProvider: provider, oauthId: oauthId },
    });
    if (user) {
      return user;
    }
    // Utilise l'email comme username si disponible, sinon le displayName ou l'oauthId
    const username = email || displayName || oauthId;
    // Créer un mot de passe dummy sécurisé
    const dummyPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(dummyPassword, 10);

    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
      oauthProvider: provider,
      oauthId: oauthId,
      email,
    });
    return this.userRepository.save(newUser);
  }
}
