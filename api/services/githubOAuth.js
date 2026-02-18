const { Octokit } = require('octokit');
const { prisma } = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:4321/api/integrations/github/oauth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4321';

/**
 * Genera la URL de autorización de GitHub OAuth
 */
function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    state: state,
    // Scope completo para acceder a repositorios públicos y privados
    scope: 'repo,read:user,user:email,read:org',
    // Permitir que el usuario vea y autorice la aplicación
    allow_signup: 'true'
  });

  console.log('🔗 [GitHubOAuth] URL de autorización generada con scope:', params.get('scope'));
  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  console.log('🔗 [GitHubOAuth] URL completa:', authUrl);
  return authUrl;
}

/**
 * Intercambia el código de autorización por un token de acceso
 */
async function exchangeCodeForToken(code) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code: code
    })
  });

  if (!response.ok) {
    throw new Error('Error al intercambiar código por token');
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return data.access_token;
}

/**
 * Obtiene información del usuario de GitHub usando el token
 */
async function getGitHubUser(accessToken) {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.rest.users.getAuthenticated();
  return data;
}

/**
 * Guarda o actualiza la cuenta de GitHub del usuario
 */
async function saveGitHubAccount(userId, githubUser, accessToken, refreshToken = null, expiresAt = null) {
  const encryptedAccessToken = encrypt(accessToken);
  const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

  console.log('💾 [GitHubOAuth] Guardando cuenta de GitHub:', {
    userId,
    username: githubUser.login,
    encryptedTokenLength: encryptedAccessToken?.length || 0,
    encryptedTokenPreview: encryptedAccessToken?.substring(0, 50) + '...' || 'null'
  });

  const accountData = {
    userId,
    githubUserId: String(githubUser.id),
    username: githubUser.login,
    accessTokenEncrypted: encryptedAccessToken,
    refreshTokenEncrypted: encryptedRefreshToken,
    tokenExpiresAt: expiresAt ? new Date(expiresAt) : null
  };

  // Upsert: actualizar si existe, crear si no
  // Nota: Prisma genera gitHubAccount (camelCase) desde GitHubAccount
  const account = await prisma.gitHubAccount.upsert({
    where: { userId },
    update: accountData,
    create: accountData
  });

  console.log('💾 [GitHubOAuth] Cuenta guardada, verificando token guardado:', {
    accountId: account.id,
    storedTokenLength: account.accessTokenEncrypted?.length || 0,
    storedTokenPreview: account.accessTokenEncrypted?.substring(0, 50) + '...' || 'null',
    matchesOriginal: account.accessTokenEncrypted === encryptedAccessToken
  });

  return account;
}

/**
 * Limpia la cuenta de GitHub del usuario (útil cuando el token está corrupto)
 */
async function clearGitHubAccount(userId) {
  try {
    await prisma.gitHubAccount.delete({
      where: { userId }
    });
    console.log('✅ [GitHubOAuth] Cuenta de GitHub eliminada para usuario:', userId);
    return true;
  } catch (error) {
    console.error('Error al eliminar cuenta de GitHub:', error);
    return false;
  }
}

/**
 * Obtiene el token de acceso descifrado del usuario
 */
async function getDecryptedToken(userId) {
  // Nota: Prisma genera gitHubAccount (camelCase) desde GitHubAccount
  const account = await prisma.gitHubAccount.findUnique({
    where: { userId }
  });

  if (!account) {
    return null;
  }

  console.log('🔓 [GitHubOAuth] Token leído de la base de datos:', {
    accountId: account.id,
    tokenLength: account.accessTokenEncrypted?.length || 0,
    tokenPreview: account.accessTokenEncrypted?.substring(0, 50) + '...' || 'null',
    tokenType: typeof account.accessTokenEncrypted
  });

  try {
    return decrypt(account.accessTokenEncrypted);
  } catch (error) {
    console.error('❌ [GitHubOAuth] Error al descifrar token:', error.message);
    console.error('⚠️ [GitHubOAuth] El token no se puede descifrar. Esto puede deberse a:');
    console.error('   1. La clave de cifrado (GITHUB_TOKEN_ENC_KEY) cambió');
    console.error('   2. El token está corrupto');
    console.error('   3. El formato del token cifrado es incorrecto');
    
    // Si el token no se puede descifrar, limpiar el registro para forzar reconexión
    console.log('🔄 [GitHubOAuth] Limpiando cuenta de GitHub corrupta...');
    await clearGitHubAccount(userId);
    
    const decryptError = new Error('El token de GitHub no se puede descifrar. Por favor, reconecta tu cuenta de GitHub.');
    decryptError.code = 'TOKEN_DECRYPT_ERROR';
    decryptError.status = 401;
    throw decryptError;
  }
}

/**
 * Crea un cliente Octokit para el usuario
 */
async function getOctokitForUser(userId) {
  try {
    const token = await getDecryptedToken(userId);
    if (!token) {
      const error = new Error('Usuario no tiene cuenta de GitHub conectada o el token no es válido');
      error.status = 401;
      throw error;
    }
    return new Octokit({ auth: token });
  } catch (error) {
    // Si hay un error de descifrado, propagarlo con información útil
    if (error.code === 'TOKEN_DECRYPT_ERROR') {
      throw error;
    }
    // Para otros errores, lanzar un error genérico
    const genericError = new Error('Usuario no tiene cuenta de GitHub conectada o el token no es válido');
    genericError.status = 401;
    throw genericError;
  }
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForToken,
  getGitHubUser,
  saveGitHubAccount,
  getDecryptedToken,
  getOctokitForUser,
  clearGitHubAccount
};

