const { prisma } = require('../config/database');

// Validar que prisma esté disponible
if (!prisma) {
  console.error('❌ ERROR CRÍTICO: Prisma no está disponible en githubController');
}

// Función helper para verificar si los modelos de GitHub existen
// Nota: Prisma genera los nombres en camelCase: gitHubAccount, gitHubRepoLink
function checkGitHubModels() {
  if (!prisma) {
    return { available: false, reason: 'Prisma no está inicializado' };
  }
  
  // Prisma convierte GitHubAccount -> gitHubAccount (camelCase)
  const hasGitHubAccount = prisma.gitHubAccount && typeof prisma.gitHubAccount.findUnique === 'function';
  const hasGitHubRepoLink = prisma.gitHubRepoLink && typeof prisma.gitHubRepoLink.findMany === 'function';
  
  if (!hasGitHubAccount || !hasGitHubRepoLink) {
    const availableModels = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
    return { 
      available: false, 
      reason: 'Modelos de GitHub no disponibles. Ejecuta: npm run db:generate (detén el servidor primero)',
      availableModels 
    };
  }
  
  return { available: true };
}
const { success, error } = require('../utils/responseHelper');
const githubOAuth = require('../services/githubOAuth');
const githubClient = require('../services/githubClient');
const githubParser = require('../services/githubParser');
const crypto = require('crypto');

class GitHubController {
  /**
   * Inicia el flujo OAuth de GitHub
   * GET /api/integrations/github/oauth/start
   */
  static async startOAuth(req, res) {
    try {
      // Generar state aleatorio para seguridad
      const state = crypto.randomBytes(32).toString('hex');
      const userId = req.user.id;
      const returnUrl = req.query.returnUrl || req.body.returnUrl; // URL a la que redirigir después de conectar
      
      console.log('🔐 [GitHubController] Iniciando OAuth:', {
        userId,
        returnUrl,
        hasQueryReturnUrl: !!req.query.returnUrl,
        hasBodyReturnUrl: !!req.body.returnUrl
      });
      
      // Guardar state, userId y returnUrl en cookies httpOnly
      // El userId es necesario en el callback porque GitHub redirige sin token JWT
      res.cookie('github_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600000 // 10 minutos
      });
      
      res.cookie('github_oauth_user_id', userId.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600000 // 10 minutos
      });

      if (returnUrl) {
        res.cookie('github_oauth_return_url', returnUrl, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600000 // 10 minutos
        });
        console.log('✅ [GitHubController] returnUrl guardado en cookie:', returnUrl);
      }

      const authUrl = githubOAuth.getAuthorizationUrl(state);
      
      console.log('🔗 [GitHubController] URL de autorización generada:', {
        authUrl,
        stateLength: state.length,
        startsWithGithub: authUrl.startsWith('https://github.com')
      });
      
      return success(res, { 
        authUrl,
        state 
      }, 'URL de autorización generada');
    } catch (err) {
      console.error('❌ [GitHubController] Error en startOAuth:', err);
      return error(res, err.message || 'Error al iniciar OAuth', 500);
    }
  }

  /**
   * Callback de OAuth de GitHub
   * GET /api/integrations/github/oauth/callback
   */
  static async oauthCallback(req, res) {
    try {
      console.log('🔄 [GitHubController] Callback OAuth recibido:', {
        hasCode: !!req.query.code,
        hasState: !!req.query.state,
        hasCookies: !!req.cookies,
        cookies: Object.keys(req.cookies || {})
      });

      // Verificar que los modelos de GitHub estén disponibles
      const modelCheck = checkGitHubModels();
      if (!modelCheck.available) {
        console.error('❌ [GitHubController] Modelos no disponibles');
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:4321'}/configuracion?tab=integraciones&error=${encodeURIComponent(modelCheck.reason)}`);
      }

      const { code, state } = req.query;
      const storedState = req.cookies?.github_oauth_state;
      const userId = req.cookies?.github_oauth_user_id;
      const returnUrl = req.cookies?.github_oauth_return_url;

      console.log('📋 [GitHubController] Datos del callback:', {
        hasCode: !!code,
        hasState: !!state,
        hasStoredState: !!storedState,
        stateMatch: state === storedState,
        hasUserId: !!userId,
        userId,
        hasReturnUrl: !!returnUrl,
        returnUrl
      });

      if (!code) {
        console.error('❌ [GitHubController] No se recibió código de autorización');
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:4321'}/configuracion?tab=integraciones&error=no_code`);
      }

      if (!state || state !== storedState) {
        console.error('❌ [GitHubController] State inválido o no coincide:', { 
          receivedState: state, 
          storedState,
          statesMatch: state === storedState
        });
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:4321'}/configuracion?tab=integraciones&error=invalid_state`);
      }

      if (!userId) {
        console.error('❌ [GitHubController] UserId no encontrado en cookies');
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:4321'}/configuracion?tab=integraciones&error=user_not_found`);
      }

      // Limpiar cookies
      res.clearCookie('github_oauth_state');
      res.clearCookie('github_oauth_user_id');
      res.clearCookie('github_oauth_return_url');

      console.log('🔄 [GitHubController] Intercambiando código por token...');
      // Intercambiar código por token
      const accessToken = await githubOAuth.exchangeCodeForToken(code);
      console.log('✅ [GitHubController] Token obtenido exitosamente');
      
      console.log('🔄 [GitHubController] Obteniendo información del usuario de GitHub...');
      // Obtener información del usuario de GitHub
      const githubUser = await githubOAuth.getGitHubUser(accessToken);
      console.log('✅ [GitHubController] Usuario de GitHub obtenido:', githubUser.login);
      
      console.log('🔄 [GitHubController] Guardando cuenta de GitHub...');
      // Guardar cuenta de GitHub usando el userId de la cookie
      await githubOAuth.saveGitHubAccount(
        parseInt(userId, 10),
        githubUser,
        accessToken
      );
      console.log('✅ [GitHubController] Cuenta de GitHub guardada exitosamente');

      // Redirigir a la URL de retorno si existe, o a configuración por defecto
      if (returnUrl) {
        // Agregar parámetro de éxito a la URL de retorno
        const separator = returnUrl.includes('?') ? '&' : '?';
        const redirectUrl = `${returnUrl}${separator}github=connected`;
        console.log('🔄 [GitHubController] Redirigiendo a:', redirectUrl);
        return res.redirect(redirectUrl);
      }

      console.log('🔄 [GitHubController] Redirigiendo a configuración (sin returnUrl)');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:4321'}/configuracion?tab=integraciones&success=connected`);
    } catch (err) {
      console.error('❌ [GitHubController] Error en oauthCallback:', err);
      console.error('Stack:', err.stack);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:4321'}/configuracion?tab=integraciones&error=${encodeURIComponent(err.message)}`);
    }
  }

  /**
   * Obtiene el estado de la integración GitHub para un proyecto
   * GET /api/projects/:projectId/integrations/github/status
   */
  static async getStatus(req, res) {
    try {
      // Verificar que los modelos de GitHub estén disponibles
      const modelCheck = checkGitHubModels();
      if (!modelCheck.available) {
        console.error('❌', modelCheck.reason);
        if (modelCheck.availableModels) {
          console.error('Modelos disponibles:', modelCheck.availableModels);
        }
        return success(res, {
          isConnected: false,
          githubUsername: null,
          linkedRepos: [],
          error: 'Modelos no disponibles',
          message: 'Ejecuta: npm run db:generate (detén el servidor primero)'
        }, modelCheck.reason);
      }

      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user.id;

      // Verificar si el usuario tiene GitHub conectado
      // Nota: Prisma genera gitHubAccount (camelCase) desde GitHubAccount
      let githubAccount = null;
      let repoLinks = [];

      try {
        console.log('🔍 [GitHubController] Buscando cuenta de GitHub para userId:', userId);
        githubAccount = await prisma.gitHubAccount.findUnique({
          where: { userId }
        });
        
        console.log('🔍 [GitHubController] Resultado de búsqueda:', {
          found: !!githubAccount,
          username: githubAccount?.username,
          githubUserId: githubAccount?.githubUserId,
          hasEncryptedToken: !!githubAccount?.accessTokenEncrypted
        });
        
        // Si existe una cuenta, verificar que el token se puede descifrar
        if (githubAccount) {
          try {
            console.log('🔍 [GitHubController] Intentando descifrar token para userId:', userId);
            const { getDecryptedToken } = require('../services/githubOAuth');
            const token = await getDecryptedToken(userId);
            if (!token) {
              // Si el token no se puede descifrar, la función ya limpió el registro
              console.log('⚠️ [GitHubController] Token no válido, cuenta limpiada');
              githubAccount = null;
            } else {
              console.log('✅ [GitHubController] Token descifrado exitosamente, longitud:', token.length);
            }
          } catch (decryptErr) {
            // Si hay error de descifrado, el registro ya fue limpiado por getDecryptedToken
            if (decryptErr.code === 'TOKEN_DECRYPT_ERROR') {
              console.log('⚠️ [GitHubController] Token no se puede descifrar, cuenta limpiada');
              githubAccount = null;
            } else {
              console.error('❌ [GitHubController] Error inesperado al descifrar token:', decryptErr);
              throw decryptErr;
            }
          }
        } else {
          console.log('ℹ️ [GitHubController] No se encontró cuenta de GitHub para userId:', userId);
        }
      } catch (err) {
        console.error('Error al buscar gitHubAccount:', err);
        // Si el modelo no existe o hay error de tabla, continuar sin cuenta
        if (err.code === 'P2021' || err.message?.includes('does not exist') || err.message?.includes('Unknown table')) {
          console.warn('⚠️ Tabla github_accounts no existe. Ejecuta: npm run db:migrate');
          return success(res, {
            isConnected: false,
            githubUsername: null,
            linkedRepos: []
          }, 'Estado de integración obtenido (tabla no existe - ejecuta migración)');
        }
        throw err;
      }

      try {
        if (prisma.gitHubRepoLink && typeof prisma.gitHubRepoLink.findMany === 'function') {
          repoLinks = await prisma.gitHubRepoLink.findMany({
            where: {
              projectId,
              isActive: true
            }
          });
        }
      } catch (err) {
        console.error('Error al buscar repos:', err);
        // Si el modelo no existe, continuar sin repos
        if (err.code === 'P2021' || err.message?.includes('does not exist') || err.message?.includes('Unknown table')) {
          console.warn('⚠️ Tabla github_repo_links no existe. Ejecuta: npm run db:migrate');
          repoLinks = [];
        } else {
          throw err;
        }
      }

      return success(res, {
        isConnected: !!githubAccount,
        githubUsername: githubAccount?.username || null,
        linkedRepos: repoLinks
      }, 'Estado de integración obtenido');
    } catch (err) {
      console.error('Error en getStatus:', err);
      console.error('Stack:', err.stack);
      return error(res, err.message || 'Error al obtener estado', 500);
    }
  }

  /**
   * Vincula un repositorio a un proyecto
   * POST /api/projects/:projectId/integrations/github/repos
   */
  static async linkRepository(req, res) {
    try {
      // Verificar que los modelos de GitHub estén disponibles
      const modelCheck = checkGitHubModels();
      if (!modelCheck.available) {
        return error(res, modelCheck.reason, 500);
      }

      const projectId = parseInt(req.params.projectId, 10);
      const { owner, repo } = req.body;
      const userId = req.user.id;

      if (!owner || !repo) {
        return error(res, 'Owner y repo son requeridos', 400);
      }

      // Verificar que el usuario tiene GitHub conectado
      const githubAccount = await prisma.gitHubAccount.findUnique({
        where: { userId }
      });

      if (!githubAccount) {
        return error(res, 'Debes conectar tu cuenta de GitHub primero', 400);
      }

      // Verificar que el repositorio existe y el usuario tiene acceso
      try {
        await githubClient.getRepository(userId, owner, repo);
      } catch (err) {
        if (err.status === 404) {
          return error(res, 'Repositorio no encontrado o sin acceso', 404);
        }
        throw err;
      }

      // Crear o actualizar el vínculo
      const repoLink = await prisma.gitHubRepoLink.upsert({
        where: {
          projectId_owner_repo: {
            projectId,
            owner,
            repo
          }
        },
        update: {
          isActive: true
        },
        create: {
          projectId,
          owner,
          repo,
          isActive: true
        }
      });

      return success(res, { repoLink }, 'Repositorio vinculado exitosamente');
    } catch (err) {
      console.error('Error en linkRepository:', err);
      return error(res, err.message || 'Error al vincular repositorio', 500);
    }
  }

  /**
   * Desvincula un repositorio de un proyecto
   * DELETE /api/projects/:projectId/integrations/github/repos/:repoLinkId
   */
  static async unlinkRepository(req, res) {
    try {
      // Verificar que los modelos de GitHub estén disponibles
      const modelCheck = checkGitHubModels();
      if (!modelCheck.available) {
        return error(res, modelCheck.reason, 500);
      }

      const projectId = parseInt(req.params.projectId, 10);
      const repoLinkId = parseInt(req.params.repoLinkId, 10);

      // Verificar que el repo link pertenece al proyecto
      const repoLink = await prisma.gitHubRepoLink.findFirst({
        where: {
          id: repoLinkId,
          projectId
        }
      });

      if (!repoLink) {
        return error(res, 'Repositorio no encontrado', 404);
      }

      // Desactivar en lugar de eliminar
      await prisma.gitHubRepoLink.update({
        where: { id: repoLinkId },
        data: { isActive: false }
      });

      return success(res, {}, 'Repositorio desvinculado exitosamente');
    } catch (err) {
      console.error('Error en unlinkRepository:', err);
      return error(res, err.message || 'Error al desvincular repositorio', 500);
    }
  }

  /**
   * Endpoint de prueba para verificar el token y obtener información del usuario
   * GET /api/integrations/github/test
   */
  static async testConnection(req, res) {
    try {
      const userId = req.user.id;
      const githubAccount = await prisma.gitHubAccount.findUnique({
        where: { userId }
      });

      if (!githubAccount) {
        return error(res, 'No hay cuenta de GitHub conectada', 400);
      }

      // Obtener token descifrado
      const { getDecryptedToken, getOctokitForUser } = require('../services/githubOAuth');
      let token;
      try {
        token = await getDecryptedToken(userId);
      } catch (decryptErr) {
        return error(res, `Error al descifrar token: ${decryptErr.message}`, 500);
      }

      // Crear cliente Octokit
      const octokit = await getOctokitForUser(userId);

      // Probar diferentes endpoints
      const results = {
        user: null,
        repos_all: null,
        repos_owner: null,
        repos_member: null,
        orgs: null,
        errors: []
      };

      try {
        const userResponse = await octokit.rest.users.getAuthenticated();
        results.user = {
          login: userResponse.data.login,
          id: userResponse.data.id,
          type: userResponse.data.type
        };
      } catch (err) {
        results.errors.push(`getAuthenticated: ${err.message}`);
      }

      // Probar listForAuthenticatedUser con diferentes tipos
      for (const type of ['all', 'owner', 'member']) {
        try {
          const reposResponse = await octokit.rest.repos.listForAuthenticatedUser({
            type,
            per_page: 10
          });
          results[`repos_${type}`] = {
            count: reposResponse.data?.length || 0,
            repos: reposResponse.data?.slice(0, 3).map(r => r.full_name) || []
          };
        } catch (err) {
          results.errors.push(`listForAuthenticatedUser(${type}): ${err.message} (status: ${err.status})`);
        }
      }

      // Probar obtener organizaciones
      try {
        const orgsResponse = await octokit.rest.orgs.listForAuthenticatedUser();
        results.orgs = {
          count: orgsResponse.data?.length || 0,
          orgs: orgsResponse.data?.map(o => o.login) || []
        };
      } catch (err) {
        results.errors.push(`listForAuthenticatedUser (orgs): ${err.message}`);
      }

      return success(res, results, 'Prueba de conexión completada');
    } catch (err) {
      console.error('Error en testConnection:', err);
      return error(res, err.message || 'Error en prueba de conexión', 500);
    }
  }

  /**
   * Lista los repositorios del usuario autenticado
   * GET /api/integrations/github/repos
   */
  static async listRepositories(req, res) {
    try {
      // Verificar que los modelos de GitHub estén disponibles
      const modelCheck = checkGitHubModels();
      if (!modelCheck.available) {
        return error(res, modelCheck.reason, 500);
      }

      const userId = req.user.id;

      // Verificar que el usuario tiene GitHub conectado
      let githubAccount = await prisma.gitHubAccount.findUnique({
        where: { userId }
      });

      if (!githubAccount) {
        return error(res, 'Debes conectar tu cuenta de GitHub primero', 400);
      }

      // Verificar que el token se puede descifrar antes de intentar usarlo
      try {
        const { getDecryptedToken } = require('../services/githubOAuth');
        const token = await getDecryptedToken(userId);
        if (!token) {
          // Si el token no se puede descifrar, la función ya limpió el registro
          return error(res, 'El token de GitHub no es válido. Por favor, reconecta tu cuenta de GitHub.', 401);
        }
      } catch (decryptErr) {
        // Si hay error de descifrado, el registro ya fue limpiado
        if (decryptErr.code === 'TOKEN_DECRYPT_ERROR') {
          return error(res, 'El token de GitHub no se puede descifrar. Por favor, reconecta tu cuenta de GitHub.', 401);
        }
        throw decryptErr;
      }

      // Obtener repositorios del usuario
      try {
        console.log('📋 [GitHubController] Obteniendo repositorios para usuario:', userId);
        console.log('📋 [GitHubController] GitHubAccount encontrado:', {
          id: githubAccount.id,
          username: githubAccount.username,
          githubUserId: githubAccount.githubUserId
        });
        
        const repos = await githubClient.listUserRepositories(userId, {
          type: 'all', // Incluye propios, colaboraciones y organizaciones
          sort: 'updated',
          per_page: 100
        });

        console.log('📋 [GitHubController] Repositorios obtenidos:', repos.length);
        if (repos.length > 0) {
          console.log('📋 [GitHubController] Primeros repos:', repos.slice(0, 3).map(r => r.full_name));
        }
        return success(res, { repos }, 'Repositorios obtenidos exitosamente');
      } catch (githubErr) {
        console.error('Error al obtener repositorios de GitHub:', githubErr);
        
        // Si el error es de descifrado del token
        if (githubErr.code === 'TOKEN_DECRYPT_ERROR' || githubErr.message?.includes('descifrar')) {
          return error(res, 'El token de GitHub no se puede descifrar. Por favor, reconecta tu cuenta de GitHub.', 401);
        }
        
        // Si el error es de autenticación (401), el token puede haber expirado o ser inválido
        if (githubErr.status === 401 || githubErr.message?.includes('Bad credentials') || githubErr.message?.includes('no es válido')) {
          return error(res, 'El token de GitHub ha expirado o no es válido. Por favor, reconecta tu cuenta de GitHub.', 401);
        }
        
        // Si el error es de permisos (403), el token no tiene los permisos necesarios
        if (githubErr.status === 403) {
          return error(res, 'No tienes permisos para acceder a los repositorios. Verifica los permisos de la aplicación.', 403);
        }
        
        throw githubErr;
      }
    } catch (err) {
      console.error('Error en listRepositories:', err);
      return error(res, err.message || 'Error al obtener repositorios', 500);
    }
  }

  /**
   * Obtiene actividad reciente de GitHub (PRs y commits)
   * GET /api/projects/:projectId/integrations/github/activity
   */
  static async getActivity(req, res) {
    try {
      // Verificar que los modelos de GitHub estén disponibles
      const modelCheck = checkGitHubModels();
      if (!modelCheck.available) {
        return error(res, modelCheck.reason, 500);
      }

      const projectId = parseInt(req.params.projectId, 10);
      const { owner, repo } = req.query;
      const userId = req.user.id;

      if (!owner || !repo) {
        return error(res, 'Owner y repo son requeridos', 400);
      }

      // Verificar que el usuario tiene GitHub conectado
      const githubAccount = await prisma.gitHubAccount.findUnique({
        where: { userId }
      });

      if (!githubAccount) {
        return error(res, 'Debes conectar tu cuenta de GitHub primero', 400);
      }

      // Obtener configuración del proyecto (prefijo)
      const projectSetting = await prisma.projectSetting.findUnique({
        where: { projectId }
      });
      const prefix = projectSetting?.githubIssueKeyPrefix || 'SP-';

      // Obtener PRs y commits recientes
      const [pullRequests, commits] = await Promise.all([
        githubClient.getRecentPullRequests(userId, owner, repo, 20),
        githubClient.getRecentCommits(userId, owner, repo, 20)
      ]);

      // Vincular automáticamente a tareas
      console.log('🔗 [GitHubController] Iniciando vinculación automática de tareas...');
      console.log('🔗 [GitHubController] Prefijo configurado:', prefix);
      console.log('🔗 [GitHubController] Commits a procesar:', commits.length);
      console.log('🔗 [GitHubController] PRs a procesar:', pullRequests.length);
      
      const [prLinks, commitLinks] = await Promise.all([
        githubParser.linkItemsToTasks(projectId, pullRequests, 'PULL_REQUEST', prefix),
        githubParser.linkItemsToTasks(projectId, commits, 'COMMIT', prefix)
      ]);
      
      console.log('✅ [GitHubController] Enlaces creados:', {
        prs: prLinks.length,
        commits: commitLinks.length
      });
      
      if (commitLinks.length > 0) {
        console.log('📋 [GitHubController] Enlaces de commits creados:');
        commitLinks.forEach(link => {
          console.log(`  - Commit ${link.item.sha?.substring(0, 7)} → Tarea #${link.taskId}`);
        });
      }

      // Obtener enlaces existentes para estos items
      const prNumbers = pullRequests.map(pr => String(pr.number));
      const commitShas = commits.map(c => c.sha);

      const existingLinks = await prisma.taskExternalLink.findMany({
        where: {
          provider: 'GITHUB',
          OR: [
            {
              externalType: 'PULL_REQUEST',
              externalId: { in: prNumbers }
            },
            {
              externalType: 'COMMIT',
              externalId: { in: commitShas }
            }
          ]
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      });

      // Mapear enlaces a PRs y commits
      const prsWithLinks = pullRequests.map(pr => {
        const link = existingLinks.find(
          l => l.externalType === 'PULL_REQUEST' && l.externalId === String(pr.number)
        );
        return {
          ...pr,
          linkedTask: link ? {
            id: link.task.id,
            title: link.task.title,
            status: link.task.status
          } : null
        };
      });

      const commitsWithLinks = commits.map(commit => {
        const link = existingLinks.find(
          l => l.externalType === 'COMMIT' && l.externalId === commit.sha
        );
        return {
          ...commit,
          linkedTask: link ? {
            id: link.task.id,
            title: link.task.title,
            status: link.task.status
          } : null
        };
      });

      return success(res, {
        pullRequests: prsWithLinks,
        commits: commitsWithLinks,
        linksCreated: {
          prs: prLinks.length,
          commits: commitLinks.length
        }
      }, 'Actividad obtenida exitosamente');
    } catch (err) {
      console.error('Error en getActivity:', err);
      return error(res, err.message || 'Error al obtener actividad', 500);
    }
  }

  /**
   * Vincular manualmente un commit a una tarea
   * POST /api/integrations/github/tasks/:taskId/commits
   */
  static async linkCommitToTask(req, res) {
    try {
      const { taskId } = req.params;
      const { commitSha, owner, repo } = req.body;
      const userId = req.user.id;

      if (!commitSha || !owner || !repo) {
        return error(res, 'commitSha, owner y repo son requeridos', 400);
      }

      // Verificar que la tarea existe y el usuario tiene acceso
      const task = await prisma.task.findUnique({
        where: { id: parseInt(taskId) },
        include: {
          userStory: {
            include: {
              epic: {
                include: {
                  project: {
                    include: {
                      members: {
                        where: { userId: userId }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!task) {
        return error(res, 'Tarea no encontrada', 404);
      }

      const projectId = task.userStory.epic.projectId;
      const globalRole = req.user.globalRole;
      
      // ADMIN y MANAGER tienen acceso a todos los proyectos
      const isAdminOrManager = globalRole === 'ADMIN' || globalRole === 'MANAGER';
      const isMember = task.userStory.epic.project.members.length > 0;

      if (!isAdminOrManager && !isMember) {
        return error(res, 'No tienes acceso a este proyecto', 403);
      }

      // Obtener el commit de GitHub
      const githubAccount = await prisma.gitHubAccount.findUnique({
        where: { userId: userId }
      });

      if (!githubAccount) {
        return error(res, 'No tienes cuenta de GitHub conectada', 400);
      }

      const { getDecryptedToken } = require('../services/githubOAuth');
      const token = await getDecryptedToken(userId);

      if (!token) {
        return error(res, 'No se pudo obtener el token de GitHub', 500);
      }

      const { Octokit } = require('octokit');
      const octokit = new Octokit({ auth: token });

      // Obtener el commit de GitHub
      const { data: commit } = await octokit.rest.repos.getCommit({
        owner: owner,
        repo: repo,
        ref: commitSha
      });

      // Crear o actualizar el enlace
      const link = await prisma.taskExternalLink.upsert({
        where: {
          taskId_provider_externalType_externalId: {
            taskId: parseInt(taskId),
            provider: 'GITHUB',
            externalType: 'COMMIT',
            externalId: commitSha
          }
        },
        update: {
          url: commit.html_url,
          title: commit.commit.message.split('\n')[0] || `Commit ${commitSha.substring(0, 7)}`
        },
        create: {
          taskId: parseInt(taskId),
          provider: 'GITHUB',
          externalType: 'COMMIT',
          externalId: commitSha,
          url: commit.html_url,
          title: commit.commit.message.split('\n')[0] || `Commit ${commitSha.substring(0, 7)}`
        }
      });

      return success(res, {
        link: {
          id: link.id,
          taskId: link.taskId,
          commitSha: link.externalId,
          url: link.url,
          title: link.title
        }
      }, 'Commit vinculado exitosamente');
    } catch (err) {
      console.error('Error en linkCommitToTask:', err);
      if (err.status === 404) {
        return error(res, 'Commit no encontrado en GitHub', 404);
      }
      return error(res, err.message || 'Error al vincular commit', 500);
    }
  }
}

module.exports = GitHubController;

