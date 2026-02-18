const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
// Estructura: salt (64) + iv (16) + encryptedData (variable) + tag (16)
// El tag va al final, no después del IV
const SALT_IV_POSITION = SALT_LENGTH + IV_LENGTH;

/**
 * Obtiene la clave de cifrado desde la variable de entorno
 * Siempre usa la clave base64 decodificada directamente si tiene 32 bytes
 * Si no, deriva una clave de 32 bytes usando PBKDF2
 */
// Cache para la clave de cifrado para asegurar consistencia
let cachedEncryptionKey = null;

function getEncryptionKey() {
  // Si ya tenemos la clave en caché, usarla
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }
  
  const key = process.env.GITHUB_TOKEN_ENC_KEY;
  if (!key) {
    throw new Error('GITHUB_TOKEN_ENC_KEY no está configurada en las variables de entorno');
  }
  
  // Intentar decodificar como base64 primero
  try {
    const decoded = Buffer.from(key, 'base64');
    if (decoded.length === 32) {
      // Si la decodificación base64 da exactamente 32 bytes, usarla directamente
      // Esto asegura compatibilidad con tokens cifrados anteriormente
      console.log('🔑 [Encryption] Usando clave base64 directa (32 bytes)');
      cachedEncryptionKey = decoded;
      return cachedEncryptionKey;
    }
    console.log(`⚠️ [Encryption] Clave base64 decodificada tiene ${decoded.length} bytes, usando PBKDF2`);
  } catch (e) {
    // Si no es base64 válido, continuar con PBKDF2
    console.log('⚠️ [Encryption] Clave no es base64 válido, usando PBKDF2');
  }
  
  // Si no es base64 válido o no tiene 32 bytes, derivar una clave de 32 bytes usando PBKDF2
  // Usar un salt fijo para que la misma clave siempre produzca el mismo resultado
  const keyBuffer = Buffer.from(key);
  const derivedKey = crypto.pbkdf2Sync(keyBuffer, 'github-token-encryption-salt-v1', 100000, 32, 'sha256');
  console.log('🔑 [Encryption] Usando clave derivada con PBKDF2');
  cachedEncryptionKey = derivedKey;
  return cachedEncryptionKey;
}

/**
 * Cifra un texto usando AES-256-GCM
 * @param {string} text - Texto a cifrar
 * @returns {string} - Texto cifrado en formato base64
 */
function encrypt(text) {
  if (!text) {
    return null;
  }

  try {
    console.log('🔒 [Encryption] Cifrando token...');
    const key = getEncryptionKey();
    console.log('🔒 [Encryption] Clave obtenida, longitud:', key.length);
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Cifrar el texto
    const encryptedText = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);
    
    // Obtener el tag de autenticación ANTES de concatenar todo
    const tag = cipher.getAuthTag();
    
    // Concatenar: salt + iv + encryptedText + tag
    const encrypted = Buffer.concat([
      salt,
      iv,
      encryptedText,
      tag
    ]);
    
    const result = encrypted.toString('base64');
    console.log('✅ [Encryption] Token cifrado exitosamente, longitud:', result.length);
    return result;
  } catch (error) {
    console.error('❌ [Encryption] Error al cifrar:', error);
    throw new Error('Error al cifrar el token');
  }
}

/**
 * Descifra un texto cifrado con AES-256-GCM
 * @param {string} encryptedText - Texto cifrado en formato base64
 * @returns {string} - Texto descifrado
 */
function decrypt(encryptedText) {
  if (!encryptedText) {
    return null;
  }

  try {
    console.log('🔓 [Encryption] Descifrando token...');
    const key = getEncryptionKey();
    console.log('🔓 [Encryption] Clave obtenida, longitud:', key.length);
    const encrypted = Buffer.from(encryptedText, 'base64');
    console.log('🔓 [Encryption] Token cifrado recibido, longitud:', encrypted.length);
    
    const salt = encrypted.slice(0, SALT_LENGTH);
    const iv = encrypted.slice(SALT_LENGTH, SALT_IV_POSITION);
    // El tag está al final (últimos 16 bytes)
    const tag = encrypted.slice(-TAG_LENGTH);
    // Los datos cifrados están entre el IV y el tag
    const encryptedData = encrypted.slice(SALT_IV_POSITION, -TAG_LENGTH);
    
    console.log('🔓 [Encryption] Componentes extraídos:', {
      saltLength: salt.length,
      ivLength: iv.length,
      tagLength: tag.length,
      encryptedDataLength: encryptedData.length
    });
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);
    
    console.log('✅ [Encryption] Token descifrado exitosamente');
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('❌ [Encryption] Error al descifrar:', error.message);
    console.error('❌ [Encryption] Stack:', error.stack);
    throw new Error('Error al descifrar el token');
  }
}

module.exports = {
  encrypt,
  decrypt
};

