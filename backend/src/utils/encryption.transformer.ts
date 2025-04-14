import * as crypto from 'crypto';

// Vérification que la variable d'environnement ENCRYPTION_KEY est bien définie
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY must be set in the environment variables.');
}

// Récupération de la clé de chiffrement depuis la variable d'environnement
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validation de la clé : elle doit être exactement de 32 caractères pour AES-256-CBC
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters long.');
}

const IV_LENGTH = 16; // Taille de l’IV pour AES-256-CBC

export const EncryptionTransformer = {
  /**
   * Transformer "to" : chiffre la valeur avant de la sauvegarder dans la base
   * @param value La valeur à chiffrer
   * @returns La valeur chiffrée ou null
   */
  to: (value: string | null): string | null => {
    if (!value) return value;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'utf8'),
      iv,
    );
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  },

  /**
   * Transformer "from" : déchiffre la valeur lue depuis la base
   * @param value La valeur chiffrée
   * @returns La valeur déchiffrée ou null
   */
  from: (value: string | null): string | null => {
    if (!value) return value;
    const parts = value.split(':');
    if (parts.length !== 2) return value;
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'utf8'),
      iv,
    );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  },
};
