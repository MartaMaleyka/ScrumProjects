const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed completo (organizaciones + usuarios + proyecto)...\n');

  try {
    // Verificar si ya existen usuarios (para evitar ejecutar el seed innecesariamente)
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log(`ℹ️  Ya existen ${existingUsers} usuarios en la base de datos.`);
      console.log('   Usando upsert para actualizar/crear usuarios (no se crearán duplicados).\n');
    }

    // ==========================================
    // PARTE 0: CREAR ORGANIZACIONES
    // ==========================================
    console.log('🏢 PARTE 0: Creando organizaciones...\n');
    
    // Organización Sprintiva HQ
    const orgSprintiva = await prisma.organization.upsert({
      where: { slug: 'sprintiva-hq' },
      update: {},
      create: {
        name: 'Sprintiva HQ',
        slug: 'sprintiva-hq',
        isActive: true,
      },
    });
    console.log('✅ Organización creada:', orgSprintiva.name);

    // Organización Demo
    const orgDemo = await prisma.organization.upsert({
      where: { slug: 'demo-org' },
      update: {},
      create: {
        name: 'Demo Org',
        slug: 'demo-org',
        isActive: true,
      },
    });
    console.log('✅ Organización creada:', orgDemo.name);
    console.log('');

    // ==========================================
    // PARTE 1: CREAR USUARIOS
    // ==========================================
    console.log('📝 PARTE 1: Creando/actualizando usuarios...\n');
    
    // Hash de contraseña por defecto
    const defaultPassword = 'pruebadev123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // SUPER_ADMIN (solo uno, sin organización específica - puede ver todas)
    // Nota: SUPER_ADMIN no necesita organizationId válido, pero Prisma lo requiere
    // Usaremos la primera organización como "placeholder"
    const superAdmin = await prisma.user.upsert({
      where: { email: 'superadmin@sprintiva.com' },
      update: {
        globalRole: 'SUPER_ADMIN',
        organizationId: orgSprintiva.id,
      },
      create: {
        email: 'superadmin@sprintiva.com',
        username: 'superadmin',
        name: 'Super Administrador',
        password: hashedPassword,
        globalRole: 'SUPER_ADMIN',
        organizationId: orgSprintiva.id, // Placeholder, puede ver todas las orgs
        isActive: true,
      },
    });
    console.log('✅ Usuario SUPER_ADMIN:', superAdmin.email);

    // Usuario Administrador (ADMIN de organización)
    const admin = await prisma.user.upsert({
      where: { email: 'marta.magallon@gestorproyectos.com' },
      update: {
        globalRole: 'ADMIN',
        organizationId: orgSprintiva.id,
      },
      create: {
        email: 'marta.magallon@gestorproyectos.com',
        username: 'mmagallon',
        name: 'Marta Magallón',
        password: hashedPassword,
        globalRole: 'ADMIN',
        organizationId: orgSprintiva.id,
        isActive: true,
      },
    });
    console.log('✅ Usuario administrador:', admin.email);

    // Usuario Product Owner / Manager
    const productOwner = await prisma.user.upsert({
      where: { email: 'juan.perez@gestorproyectos.com' },
      update: {
        globalRole: 'MANAGER',
        organizationId: orgSprintiva.id,
      },
      create: {
        email: 'juan.perez@gestorproyectos.com',
        username: 'jperez',
        name: 'Juan Pérez',
        password: hashedPassword,
        globalRole: 'MANAGER',
        organizationId: orgSprintiva.id,
        isActive: true,
      },
    });
    console.log('✅ Usuario Product Owner:', productOwner.email);

    // Usuario Scrum Master / Manager
    const scrumMaster = await prisma.user.upsert({
      where: { email: 'maria.gonzalez@gestorproyectos.com' },
      update: {
        globalRole: 'MANAGER',
        organizationId: orgSprintiva.id,
      },
      create: {
        email: 'maria.gonzalez@gestorproyectos.com',
        username: 'mgonzalez',
        name: 'María González',
        password: hashedPassword,
        globalRole: 'MANAGER',
        organizationId: orgSprintiva.id,
        isActive: true,
      },
    });
    console.log('✅ Usuario Scrum Master:', scrumMaster.email);

    // Usuario Desarrollador 1
    const developer1 = await prisma.user.upsert({
      where: { email: 'carlos.rodriguez@gestorproyectos.com' },
      update: {
        organizationId: orgSprintiva.id,
      },
      create: {
        email: 'carlos.rodriguez@gestorproyectos.com',
        username: 'crodriguez',
        name: 'Carlos Rodríguez',
        password: hashedPassword,
        organizationId: orgSprintiva.id,
        isActive: true,
      },
    });
    console.log('✅ Usuario Desarrollador 1:', developer1.email);

    // Usuario Desarrollador 2
    const developer2 = await prisma.user.upsert({
      where: { email: 'ana.martinez@gestorproyectos.com' },
      update: {
        organizationId: orgSprintiva.id,
      },
      create: {
        email: 'ana.martinez@gestorproyectos.com',
        username: 'amartinez',
        name: 'Ana Martínez',
        password: hashedPassword,
        organizationId: orgSprintiva.id,
        isActive: true,
      },
    });
    console.log('✅ Usuario Desarrollador 2:', developer2.email);

    // Usuario Tester
    const tester = await prisma.user.upsert({
      where: { email: 'luis.lopez@gestorproyectos.com' },
      update: {
        organizationId: orgSprintiva.id,
      },
      create: {
        email: 'luis.lopez@gestorproyectos.com',
        username: 'llopez',
        name: 'Luis López',
        password: hashedPassword,
        organizationId: orgSprintiva.id,
        isActive: true,
      },
    });
    console.log('✅ Usuario Tester:', tester.email);

    // Usuario Diseñador
    const designer = await prisma.user.upsert({
      where: { email: 'sofia.ramirez@gestorproyectos.com' },
      update: {
        organizationId: orgSprintiva.id,
      },
      create: {
        email: 'sofia.ramirez@gestorproyectos.com',
        username: 'sramirez',
        name: 'Sofía Ramírez',
        password: hashedPassword,
        organizationId: orgSprintiva.id,
        isActive: true,
      },
    });
    console.log('✅ Usuario Diseñador:', designer.email);

    // Usuario Stakeholder
    const stakeholder = await prisma.user.upsert({
      where: { email: 'roberto.torres@gestorproyectos.com' },
      update: {
        organizationId: orgSprintiva.id,
      },
      create: {
        email: 'roberto.torres@gestorproyectos.com',
        username: 'rtorres',
        name: 'Roberto Torres',
        password: hashedPassword,
        organizationId: orgSprintiva.id,
        isActive: true,
      },
    });
    console.log('✅ Usuario Stakeholder:', stakeholder.email);

    // Usuario adicional - Desarrollador Senior
    const seniorDev = await prisma.user.upsert({
      where: { email: 'diego.morales@gestorproyectos.com' },
      update: {
        organizationId: orgSprintiva.id,
      },
      create: {
        email: 'diego.morales@gestorproyectos.com',
        username: 'dmorales',
        name: 'Diego Morales',
        password: hashedPassword,
        organizationId: orgSprintiva.id,
        isActive: true,
      },
    });
    console.log('✅ Usuario Desarrollador Senior:', seniorDev.email);

    // Usuario adicional - DevOps
    const devops = await prisma.user.upsert({
      where: { email: 'patricia.castro@gestorproyectos.com' },
      update: {
        organizationId: orgSprintiva.id,
      },
      create: {
        email: 'patricia.castro@gestorproyectos.com',
        username: 'pcastro',
        name: 'Patricia Castro',
        password: hashedPassword,
        organizationId: orgSprintiva.id,
        isActive: true,
      },
    });
    console.log('✅ Usuario DevOps:', devops.email);

    console.log('\n📋 Resumen de usuarios:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email                              | Username      | Nombre                | Rol');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${superAdmin.email.padEnd(33)} | ${superAdmin.username.padEnd(13)} | ${superAdmin.name.padEnd(21)} | SUPER_ADMIN`);
    console.log(`${admin.email.padEnd(33)} | ${admin.username.padEnd(13)} | ${admin.name.padEnd(21)} | ADMIN`);
    console.log(`${productOwner.email.padEnd(33)} | ${productOwner.username.padEnd(13)} | ${productOwner.name.padEnd(21)} | MANAGER`);
    console.log(`${scrumMaster.email.padEnd(33)} | ${scrumMaster.username.padEnd(13)} | ${scrumMaster.name.padEnd(21)} | MANAGER`);
    console.log(`${developer1.email.padEnd(33)} | ${developer1.username.padEnd(13)} | ${developer1.name.padEnd(21)} | USER`);
    console.log(`${developer2.email.padEnd(33)} | ${developer2.username.padEnd(13)} | ${developer2.name.padEnd(21)} | USER`);
    console.log(`${tester.email.padEnd(33)} | ${tester.username.padEnd(13)} | ${tester.name.padEnd(21)} | USER`);
    console.log(`${designer.email.padEnd(33)} | ${designer.username.padEnd(13)} | ${designer.name.padEnd(21)} | USER`);
    console.log(`${stakeholder.email.padEnd(33)} | ${stakeholder.username.padEnd(13)} | ${stakeholder.name.padEnd(21)} | USER`);
    console.log(`${seniorDev.email.padEnd(33)} | ${seniorDev.username.padEnd(13)} | ${seniorDev.name.padEnd(21)} | USER`);
    console.log(`${devops.email.padEnd(33)} | ${devops.username.padEnd(13)} | ${devops.name.padEnd(21)} | USER`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n🔐 Contraseña por defecto para todos los usuarios: ${defaultPassword}`);
    console.log('⚠️  IMPORTANTE: Cambia las contraseñas después del primer inicio de sesión\n');

    // ==========================================
    // PARTE 2: CREAR PROYECTO COMPLETO
    // ==========================================
    console.log('📦 PARTE 2: Creando proyecto completo...\n');

    // Verificar si el proyecto ya existe
    const existingProject = await prisma.project.findFirst({
      where: {
        name: 'Sistema de Gestión de Proyectos Scrum'
      }
    });

    if (existingProject) {
      console.log('⚠️  El proyecto ya existe. Saltando creación del proyecto completo.');
      console.log(`   Proyecto ID: ${existingProject.id}\n`);
      return;
    }

    // 2. Crear proyecto
    console.log('📦 Creando proyecto...');
    const project = await prisma.project.create({
      data: {
        name: 'Sistema de Gestión de Proyectos Scrum',
        description: 'Proyecto completo de ejemplo con épicas, historias, sprints, tareas y releases para demostrar todas las funcionalidades del sistema.',
        status: 'ACTIVE',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-06-30'),
        organizationId: orgSprintiva.id,
        createdById: admin.id,
        members: {
          create: [
            {
              userId: admin.id,
              role: 'PRODUCT_OWNER',
            },
            {
              userId: productOwner.id,
              role: 'SCRUM_MASTER',
            },
            {
              userId: developer1.id,
              role: 'DEVELOPER',
            },
            {
              userId: developer2.id,
              role: 'DEVELOPER',
            },
            {
              userId: tester.id,
              role: 'TESTER',
            },
          ],
        },
      },
    });
    console.log(`✅ Proyecto creado: ${project.name} (ID: ${project.id}, Org: ${orgSprintiva.name})\n`);

    // 3. Crear épicas
    console.log('🎯 Creando épicas...');
    const epic1 = await prisma.epic.create({
      data: {
        title: 'Módulo de Autenticación y Seguridad',
        description: 'Implementar sistema completo de autenticación de usuarios con soporte para múltiples métodos de login, recuperación de contraseña y gestión de sesiones.',
        projectId: project.id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        businessValue: '100',
      },
    });

    const epic2 = await prisma.epic.create({
      data: {
        title: 'Dashboard y Visualización de Datos',
        description: 'Crear dashboard interactivo con gráficos, métricas y visualizaciones de datos del proyecto.',
        projectId: project.id,
        status: 'READY',
        priority: 'MEDIUM',
        businessValue: '80',
      },
    });

    const epic3 = await prisma.epic.create({
      data: {
        title: 'Sistema de Notificaciones',
        description: 'Implementar sistema de notificaciones en tiempo real para eventos del proyecto.',
        projectId: project.id,
        status: 'DRAFT',
        priority: 'LOW',
        businessValue: '60',
      },
    });

    console.log(`✅ Épicas creadas: ${epic1.title}, ${epic2.title}, ${epic3.title}\n`);

    // 4. Crear historias de usuario
    console.log('📖 Creando historias de usuario...');
    
    // Historias para Epic 1
    const story1 = await prisma.userStory.create({
      data: {
        title: 'Como usuario quiero poder autenticarme con email y contraseña para acceder al sistema',
        description: 'Implementar formulario de login con validación de credenciales.',
        acceptanceCriteria: '1. Formulario de login funcional\n2. Validación de credenciales\n3. Manejo de errores\n4. Redirección después del login',
        epicId: epic1.id,
        storyPoints: 5,
        status: 'COMPLETED',
        priority: 'HIGH',
      },
    });

    const story2 = await prisma.userStory.create({
      data: {
        title: 'Como usuario quiero poder recuperar mi contraseña para recuperar el acceso a mi cuenta',
        description: 'Implementar flujo de recuperación de contraseña con enlace por email.',
        acceptanceCriteria: '1. Formulario de recuperación\n2. Envío de email con enlace\n3. Página de restablecimiento\n4. Validación de token',
        epicId: epic1.id,
        storyPoints: 8,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
      },
    });

    const story3 = await prisma.userStory.create({
      data: {
        title: 'Como administrador quiero gestionar roles y permisos para controlar el acceso al sistema',
        description: 'Implementar sistema de RBAC con roles globales y por proyecto.',
        acceptanceCriteria: '1. Definición de roles\n2. Asignación de permisos\n3. Middleware de autorización\n4. UI de gestión de roles',
        epicId: epic1.id,
        storyPoints: 13,
        status: 'READY',
        priority: 'HIGH',
      },
    });

    // Historias para Epic 2
    const story4 = await prisma.userStory.create({
      data: {
        title: 'Como usuario quiero ver un dashboard con métricas del proyecto para entender el progreso',
        description: 'Crear dashboard principal con gráficos y métricas clave.',
        acceptanceCriteria: '1. Gráfico de progreso\n2. Métricas de tareas\n3. Métricas de sprints\n4. Actualización en tiempo real',
        epicId: epic2.id,
        storyPoints: 8,
        status: 'READY',
        priority: 'MEDIUM',
      },
    });

    const story5 = await prisma.userStory.create({
      data: {
        title: 'Como usuario quiero ver un roadmap visual para planificar el proyecto',
        description: 'Implementar vista de roadmap con timeline interactivo.',
        acceptanceCriteria: '1. Timeline visual\n2. Barras de épicas\n3. Zoom y navegación\n4. Filtros por estado',
        epicId: epic2.id,
        storyPoints: 13,
        status: 'DRAFT',
        priority: 'MEDIUM',
      },
    });

    // Historias para Epic 3
    const story6 = await prisma.userStory.create({
      data: {
        title: 'Como usuario quiero recibir notificaciones cuando se me asigna una tarea',
        description: 'Implementar sistema de notificaciones para asignaciones.',
        acceptanceCriteria: '1. Notificación en tiempo real\n2. Email opcional\n3. Centro de notificaciones\n4. Marcar como leída',
        epicId: epic3.id,
        storyPoints: 5,
        status: 'DRAFT',
        priority: 'LOW',
      },
    });

    console.log(`✅ ${6} historias de usuario creadas\n`);

    // 5. Crear sprints
    console.log('🏃 Creando sprints...');
    const sprint1 = await prisma.sprint.create({
      data: {
        name: 'Sprint 1 - Fundamentos y Autenticación',
        description: 'Establecer la infraestructura base del proyecto e implementar el módulo de autenticación básico.',
        projectId: project.id,
        status: 'ACTIVE',
        startDate: new Date('2026-02-15'),
        endDate: new Date('2026-03-01'),
        goal: 'Completar autenticación básica y estructura del proyecto',
        velocity: 21,
      },
    });

    const sprint2 = await prisma.sprint.create({
      data: {
        name: 'Sprint 2 - Seguridad y Permisos',
        description: 'Implementar recuperación de contraseña y sistema de roles y permisos.',
        projectId: project.id,
        status: 'PLANNING',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-15'),
        goal: 'Completar seguridad avanzada y RBAC',
        velocity: 21,
      },
    });

    const sprint3 = await prisma.sprint.create({
      data: {
        name: 'Sprint 3 - Dashboard y Visualización',
        description: 'Desarrollar dashboard principal con métricas y visualizaciones.',
        projectId: project.id,
        status: 'PLANNING',
        startDate: new Date('2026-03-15'),
        endDate: new Date('2026-03-29'),
        goal: 'Dashboard funcional con métricas clave',
        velocity: 21,
      },
    });

    console.log(`✅ ${3} sprints creados\n`);

    // Asociar historias a sprints
    await prisma.userStory.update({
      where: { id: story1.id },
      data: { sprintId: sprint1.id },
    });

    await prisma.userStory.update({
      where: { id: story2.id },
      data: { sprintId: sprint2.id },
    });

    await prisma.userStory.update({
      where: { id: story3.id },
      data: { sprintId: sprint2.id },
    });

    await prisma.userStory.update({
      where: { id: story4.id },
      data: { sprintId: sprint3.id },
    });

    console.log('✅ Historias asociadas a sprints\n');

    // 6. Crear tareas
    console.log('✅ Creando tareas...');
    
    // Tareas para Story 1
    const task1 = await prisma.task.create({
      data: {
        title: 'Diseñar formulario de login',
        description: 'Crear diseño UI/UX del formulario de login con validaciones visuales.',
        userStoryId: story1.id,
        sprintId: sprint1.id,
        type: 'DESIGN',
        status: 'COMPLETED',
        priority: 'HIGH',
        estimatedHours: 4,
        assigneeId: developer1.id,
        startDate: new Date('2026-02-15'),
        dueDate: new Date('2026-02-16'),
        completedAt: new Date('2026-02-16'),
      },
    });

    const task2 = await prisma.task.create({
      data: {
        title: 'Implementar endpoint de autenticación',
        description: 'Crear endpoint POST /api/auth/login con validación de credenciales.',
        userStoryId: story1.id,
        sprintId: sprint1.id,
        type: 'DEVELOPMENT',
        status: 'COMPLETED',
        priority: 'HIGH',
        estimatedHours: 6,
        assigneeId: developer1.id,
        startDate: new Date('2026-02-16'),
        dueDate: new Date('2026-02-18'),
        completedAt: new Date('2026-02-18'),
      },
    });

    const task3 = await prisma.task.create({
      data: {
        title: 'Crear componente React de login',
        description: 'Implementar componente LoginForm con manejo de estado y validación.',
        userStoryId: story1.id,
        sprintId: sprint1.id,
        type: 'DEVELOPMENT',
        status: 'COMPLETED',
        priority: 'HIGH',
        estimatedHours: 8,
        assigneeId: developer2.id,
        startDate: new Date('2026-02-18'),
        dueDate: new Date('2026-02-20'),
        completedAt: new Date('2026-02-20'),
      },
    });

    const task4 = await prisma.task.create({
      data: {
        title: 'Escribir tests para autenticación',
        description: 'Crear tests unitarios y de integración para el flujo de autenticación.',
        userStoryId: story1.id,
        sprintId: sprint1.id,
        type: 'TESTING',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        estimatedHours: 4,
        assigneeId: tester.id,
        startDate: new Date('2026-02-20'),
        dueDate: new Date('2026-02-21'),
        completedAt: new Date('2026-02-21'),
      },
    });

    // Tareas para Story 2
    const task5 = await prisma.task.create({
      data: {
        title: 'Diseñar flujo de recuperación de contraseña',
        description: 'Crear wireframes y diseño del flujo completo de recuperación.',
        userStoryId: story2.id,
        sprintId: sprint2.id,
        type: 'DESIGN',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        estimatedHours: 3,
        assigneeId: developer1.id,
        startDate: new Date('2026-03-01'),
        dueDate: new Date('2026-03-02'),
      },
    });

    const task6 = await prisma.task.create({
      data: {
        title: 'Implementar servicio de email',
        description: 'Configurar servicio de envío de emails para tokens de recuperación.',
        userStoryId: story2.id,
        sprintId: sprint2.id,
        type: 'DEVELOPMENT',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedHours: 6,
        assigneeId: developer2.id,
        startDate: new Date('2026-03-03'),
        dueDate: new Date('2026-03-05'),
      },
    });

    const task7 = await prisma.task.create({
      data: {
        title: 'Crear endpoint de restablecimiento',
        description: 'Implementar endpoints para solicitar y procesar restablecimiento de contraseña.',
        userStoryId: story2.id,
        sprintId: sprint2.id,
        type: 'DEVELOPMENT',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedHours: 8,
        assigneeId: developer1.id,
        startDate: new Date('2026-03-05'),
        dueDate: new Date('2026-03-08'),
      },
    });

    // Tareas para Story 3
    const task8 = await prisma.task.create({
      data: {
        title: 'Definir modelo de datos para roles',
        description: 'Diseñar schema de base de datos para roles y permisos.',
        userStoryId: story3.id,
        sprintId: sprint2.id,
        type: 'DEVELOPMENT',
        status: 'TODO',
        priority: 'HIGH',
        estimatedHours: 4,
        assigneeId: developer1.id,
        startDate: new Date('2026-03-08'),
        dueDate: new Date('2026-03-09'),
      },
    });

    const task9 = await prisma.task.create({
      data: {
        title: 'Implementar middleware de autorización',
        description: 'Crear middlewares para validar permisos según roles.',
        userStoryId: story3.id,
        sprintId: sprint2.id,
        type: 'DEVELOPMENT',
        status: 'TODO',
        priority: 'HIGH',
        estimatedHours: 10,
        assigneeId: developer2.id,
        startDate: new Date('2026-03-09'),
        dueDate: new Date('2026-03-12'),
      },
    });

    // Tareas para Story 4
    const task10 = await prisma.task.create({
      data: {
        title: 'Crear componente de dashboard',
        description: 'Implementar componente principal del dashboard con layout responsivo.',
        userStoryId: story4.id,
        sprintId: sprint3.id,
        type: 'DEVELOPMENT',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedHours: 8,
        assigneeId: developer1.id,
        startDate: new Date('2026-03-15'),
        dueDate: new Date('2026-03-18'),
      },
    });

    const task11 = await prisma.task.create({
      data: {
        title: 'Integrar gráficos de progreso',
        description: 'Agregar librería de gráficos y crear visualizaciones de métricas.',
        userStoryId: story4.id,
        sprintId: sprint3.id,
        type: 'DEVELOPMENT',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedHours: 6,
        assigneeId: developer2.id,
        startDate: new Date('2026-03-18'),
        dueDate: new Date('2026-03-20'),
      },
    });

    console.log(`✅ ${11} tareas creadas\n`);

    // 7. Crear dependencias entre tareas
    console.log('🔗 Creando dependencias entre tareas...');
    
    await prisma.taskDependency.create({
      data: {
        taskId: task2.id,
        dependsOnId: task1.id,
        type: 'FINISH_TO_START',
        lagDays: 0,
      },
    });

    await prisma.taskDependency.create({
      data: {
        taskId: task3.id,
        dependsOnId: task2.id,
        type: 'FINISH_TO_START',
        lagDays: 0,
      },
    });

    await prisma.taskDependency.create({
      data: {
        taskId: task4.id,
        dependsOnId: task3.id,
        type: 'FINISH_TO_START',
        lagDays: 0,
      },
    });

    await prisma.taskDependency.create({
      data: {
        taskId: task6.id,
        dependsOnId: task5.id,
        type: 'FINISH_TO_START',
        lagDays: 0,
      },
    });

    await prisma.taskDependency.create({
      data: {
        taskId: task7.id,
        dependsOnId: task6.id,
        type: 'FINISH_TO_START',
        lagDays: 0,
      },
    });

    await prisma.taskDependency.create({
      data: {
        taskId: task9.id,
        dependsOnId: task8.id,
        type: 'FINISH_TO_START',
        lagDays: 0,
      },
    });

    await prisma.taskDependency.create({
      data: {
        taskId: task11.id,
        dependsOnId: task10.id,
        type: 'FINISH_TO_START',
        lagDays: 0,
      },
    });

    console.log(`✅ ${7} dependencias creadas\n`);

    // 8. Crear releases
    console.log('🚀 Creando releases...');
    
    const release1 = await prisma.release.create({
      data: {
        projectId: project.id,
        version: '1.0.0',
        name: 'Release Inicial - Autenticación',
        description: 'Primera versión del sistema con módulo de autenticación completo.',
        status: 'PLANNING',
        plannedDate: new Date('2026-03-15'),
        epicReleases: {
          create: [
            { epicId: epic1.id },
          ],
        },
      },
    });

    const release2 = await prisma.release.create({
      data: {
        projectId: project.id,
        version: '1.1.0',
        name: 'Release Dashboard',
        description: 'Segunda versión con dashboard y visualizaciones.',
        status: 'PLANNING',
        plannedDate: new Date('2026-04-01'),
        epicReleases: {
          create: [
            { epicId: epic2.id },
          ],
        },
      },
    });

    console.log(`✅ ${2} releases creados\n`);

    // 9. Generar release notes para release1
    console.log('📝 Generando release notes...');
    
    await prisma.releaseNote.createMany({
      data: [
        {
          releaseId: release1.id,
          taskId: task1.id,
          type: 'feature',
          title: 'Formulario de login implementado',
          description: 'Se ha completado el diseño e implementación del formulario de login con validaciones.',
        },
        {
          releaseId: release1.id,
          taskId: task2.id,
          type: 'feature',
          title: 'Endpoint de autenticación',
          description: 'Backend de autenticación con JWT implementado.',
        },
        {
          releaseId: release1.id,
          taskId: task3.id,
          type: 'feature',
          title: 'Componente React de login',
          description: 'Frontend de autenticación con manejo de estado completo.',
        },
        {
          releaseId: release1.id,
          taskId: task4.id,
          type: 'improvement',
          title: 'Tests de autenticación',
          description: 'Cobertura de tests para el módulo de autenticación.',
        },
      ],
    });

    console.log(`✅ ${4} release notes creadas\n`);

    // Resumen final
    console.log('✨ ¡Seed completo ejecutado exitosamente!\n');
    console.log('📊 Resumen final:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👥 Usuarios: 10');
    console.log(`📦 Proyecto: ${project.name}`);
    console.log('🎯 Épicas: 3');
    console.log('📖 Historias de usuario: 6');
    console.log('🏃 Sprints: 3');
    console.log('✅ Tareas: 11');
    console.log('🔗 Dependencias: 7');
    console.log('🚀 Releases: 2');
    console.log('👤 Miembros del proyecto: 5');
    console.log('📝 Release Notes: 4');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✅ Seed completado exitosamente');
  })
  .catch(async (e) => {
    console.error('❌ Error en el seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
