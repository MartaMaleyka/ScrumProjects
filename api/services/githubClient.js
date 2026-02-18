const { Octokit } = require('octokit');
const { getOctokitForUser } = require('./githubOAuth');

/**
 * Obtiene información de un repositorio
 */
async function getRepository(userId, owner, repo) {
  const octokit = await getOctokitForUser(userId);
  const { data } = await octokit.rest.repos.get({
    owner,
    repo
  });
  return data;
}

/**
 * Lista los pull requests recientes de un repositorio
 */
async function getRecentPullRequests(userId, owner, repo, limit = 20) {
  const octokit = await getOctokitForUser(userId);
  const { data } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    per_page: limit
  });
  return data;
}

/**
 * Lista los commits recientes de un repositorio
 */
async function getRecentCommits(userId, owner, repo, limit = 20) {
  const octokit = await getOctokitForUser(userId);
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    per_page: limit
  });
  return data;
}

/**
 * Obtiene un pull request específico
 */
async function getPullRequest(userId, owner, repo, pullNumber) {
  const octokit = await getOctokitForUser(userId);
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  });
  return data;
}

/**
 * Obtiene un commit específico
 */
async function getCommit(userId, owner, repo, sha) {
  const octokit = await getOctokitForUser(userId);
  const { data } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: sha
  });
  return data;
}

/**
 * Lista los repositorios del usuario autenticado
 * Incluye repos propios, colaboraciones y organizaciones
 */
async function listUserRepositories(userId, options = {}) {
  let octokit;
  try {
    octokit = await getOctokitForUser(userId);
  } catch (err) {
    // Si no se puede obtener el cliente, puede ser que el token no se pueda descifrar
    if (err.message?.includes('no tiene cuenta')) {
      const error = new Error('Usuario no tiene cuenta de GitHub conectada o el token no es válido');
      error.status = 401;
      throw error;
    }
    throw err;
  }

  const { type = 'all', sort = 'updated', per_page = 100 } = options;
  
  try {
    // Primero, verificar que el token funciona obteniendo el usuario autenticado
    try {
      const userResponse = await octokit.rest.users.getAuthenticated();
      console.log('✅ [GitHubClient] Token válido, usuario:', userResponse.data.login);
    } catch (userErr) {
      console.error('❌ [GitHubClient] Error al verificar token con getAuthenticated:', userErr);
      throw userErr;
    }

    // Obtener repos del usuario (propios, colaboraciones, organizaciones)
    console.log('📋 [GitHubClient] Obteniendo repositorios con opciones:', { type, sort, per_page });
    
    // Intentar primero con type='all' para obtener todos los repos
    let response;
    try {
      response = await octokit.rest.repos.listForAuthenticatedUser({
        type: 'all', // 'all', 'owner', 'member'
        sort: 'updated',
        per_page: 100,
        direction: 'desc'
      });
    } catch (listErr) {
      console.error('❌ [GitHubClient] Error al listar repos con type=all:', listErr);
      // Si falla con 'all', intentar solo con 'owner'
      console.log('🔄 [GitHubClient] Intentando con type=owner...');
      try {
        response = await octokit.rest.repos.listForAuthenticatedUser({
          type: 'owner',
          sort: 'updated',
          per_page: 100,
          direction: 'desc'
        });
      } catch (ownerErr) {
        console.error('❌ [GitHubClient] Error al listar repos con type=owner:', ownerErr);
        throw ownerErr;
      }
    }
    
    console.log('📋 [GitHubClient] Respuesta de GitHub:', {
      totalRepos: response.data?.length || 0,
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      firstRepo: response.data?.[0]?.full_name || 'N/A'
    });
    
    if (!response.data || !Array.isArray(response.data)) {
      console.warn('⚠️ [GitHubClient] Respuesta inesperada de GitHub:', {
        hasData: !!response.data,
        dataType: typeof response.data,
        response: JSON.stringify(response).substring(0, 500)
      });
      return [];
    }
    
    if (response.data.length === 0) {
      console.log('ℹ️ [GitHubClient] GitHub devolvió 0 repositorios');
      // Intentar obtener repos de organizaciones también
      console.log('🔄 [GitHubClient] Intentando obtener repos de organizaciones...');
      try {
        const orgsResponse = await octokit.rest.orgs.listForAuthenticatedUser();
        console.log('📋 [GitHubClient] Organizaciones encontradas:', orgsResponse.data?.length || 0);
        if (orgsResponse.data && orgsResponse.data.length > 0) {
          // Intentar obtener repos de cada organización
          for (const org of orgsResponse.data.slice(0, 5)) { // Limitar a 5 orgs
            try {
              const orgRepos = await octokit.rest.repos.listForOrg({
                org: org.login,
                per_page: 100
              });
              console.log(`📋 [GitHubClient] Repos de ${org.login}:`, orgRepos.data?.length || 0);
              if (orgRepos.data && orgRepos.data.length > 0) {
                // Agregar repos de la organización a la lista
                response.data = response.data.concat(orgRepos.data);
              }
            } catch (orgErr) {
              console.warn(`⚠️ [GitHubClient] Error al obtener repos de ${org.login}:`, orgErr.message);
            }
          }
        }
      } catch (orgsErr) {
        console.warn('⚠️ [GitHubClient] Error al obtener organizaciones:', orgsErr.message);
      }
      
      if (response.data.length === 0) {
        return [];
      }
    }
    
    // Formatear para facilitar el uso en el frontend
    const formattedRepos = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      description: repo.description,
      language: repo.language,
      updated_at: repo.updated_at,
      html_url: repo.html_url,
      default_branch: repo.default_branch
    }));
    
    console.log('✅ [GitHubClient] Repositorios formateados:', formattedRepos.length);
    return formattedRepos;
  } catch (err) {
    // Si GitHub devuelve un error, propagarlo con información útil
    if (err.status === 401) {
      const error = new Error('El token de GitHub ha expirado. Por favor, reconecta tu cuenta.');
      error.status = 401;
      throw error;
    }
    if (err.status === 403) {
      const error = new Error('No tienes permisos para acceder a los repositorios. Verifica los permisos de la aplicación.');
      error.status = 403;
      throw error;
    }
    throw err;
  }
}

module.exports = {
  getRepository,
  getRecentPullRequests,
  getRecentCommits,
  getPullRequest,
  getCommit,
  listUserRepositories
};

