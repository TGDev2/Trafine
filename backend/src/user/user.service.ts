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
}
