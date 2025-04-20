import * as crypto from 'crypto';

const IV_LENGTH = 16;

let cachedKey: Buffer | null = null;

/**
 * Retourne la clé AES (32 octets) depuis l'environnement,
 * ou lève une erreur explicite si elle est invalide.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error(
      'Invalid ENCRYPTION_KEY: it must be exactly 32 characters long.',
    );
  }
  cachedKey = Buffer.from(key, 'utf8');
  return cachedKey;
}

export const EncryptionTransformer = {
  /** Chiffre la valeur avant persistance */
  to: (value: string | null): string | null => {
    if (!value) return value;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  },

  /** Déchiffre la valeur lue depuis la base */
  from: (value: string | null): string | null => {
    if (!value) return value;
    const [ivHex, encryptedText] = value.split(':');
    if (!ivHex || !encryptedText) return value;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  },
};
