import * as crypto from 'crypto';

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'default_key_32_characters_long!'; // Doit être une chaîne de 32 caractères
const IV_LENGTH = 16; // Taille de l’IV pour AES-256-CBC

export const EncryptionTransformer = {
  // Transformer "to" : chiffre la valeur avant de la sauvegarder dans la base
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
  // Transformer "from" : déchiffre la valeur lue depuis la base
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
