const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de usuarios...');

  try {
    // Hash de contraseña por defecto (puedes cambiarla)
    const defaultPassword = 'Imhpa2024!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Usuario Administrador
    const admin = await prisma.user.upsert({
      where: { email: 'marta.magallon@gestorproyectos.com' },
      update: {},
      create: {
        email: 'marta.magallon@gestorproyectos.com',
        username: 'mmagallon',
        name: 'Marta Magallón',
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('✅ Usuario administrador creado:', admin.email);

    // Usuario Product Owner
    const productOwner = await prisma.user.upsert({
      where: { email: 'juan.perez@gestorproyectos.com' },
      update: {},
      create: {
        email: 'juan.perez@gestorproyectos.com',
        username: 'jperez',
        name: 'Juan Pérez',
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('✅ Usuario Product Owner creado:', productOwner.email);

    // Usuario Scrum Master
    const scrumMaster = await prisma.user.upsert({
      where: { email: 'maria.gonzalez@gestorproyectos.com' },
      update: {},
      create: {
        email: 'maria.gonzalez@gestorproyectos.com',
        username: 'mgonzalez',
        name: 'María González',
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('✅ Usuario Scrum Master creado:', scrumMaster.email);

    // Usuario Desarrollador 1
    const developer1 = await prisma.user.upsert({
      where: { email: 'carlos.rodriguez@gestorproyectos.com' },
      update: {},
      create: {
        email: 'carlos.rodriguez@gestorproyectos.com',
        username: 'crodriguez',
        name: 'Carlos Rodríguez',
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('✅ Usuario Desarrollador 1 creado:', developer1.email);

    // Usuario Desarrollador 2
    const developer2 = await prisma.user.upsert({
      where: { email: 'ana.martinez@gestorproyectos.com' },
      update: {},
      create: {
        email: 'ana.martinez@gestorproyectos.com',
        username: 'amartinez',
        name: 'Ana Martínez',
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('✅ Usuario Desarrollador 2 creado:', developer2.email);

    // Usuario Tester
    const tester = await prisma.user.upsert({
      where: { email: 'luis.lopez@gestorproyectos.com' },
      update: {},
      create: {
        email: 'luis.lopez@gestorproyectos.com',
        username: 'llopez',
        name: 'Luis López',
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('✅ Usuario Tester creado:', tester.email);

    // Usuario Diseñador
    const designer = await prisma.user.upsert({
      where: { email: 'sofia.ramirez@gestorproyectos.com' },
      update: {},
      create: {
        email: 'sofia.ramirez@gestorproyectos.com',
        username: 'sramirez',
        name: 'Sofía Ramírez',
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('✅ Usuario Diseñador creado:', designer.email);

    // Usuario Stakeholder
    const stakeholder = await prisma.user.upsert({
      where: { email: 'roberto.torres@gestorproyectos.com' },
      update: {},
      create: {
        email: 'roberto.torres@gestorproyectos.com',
        username: 'rtorres',
        name: 'Roberto Torres',
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('✅ Usuario Stakeholder creado:', stakeholder.email);

    // Usuario adicional - Desarrollador Senior
    const seniorDev = await prisma.user.upsert({
      where: { email: 'diego.morales@gestorproyectos.com' },
      update: {},
      create: {
        email: 'diego.morales@gestorproyectos.com',
        username: 'dmorales',
        name: 'Diego Morales',
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('✅ Usuario Desarrollador Senior creado:', seniorDev.email);

    // Usuario adicional - DevOps
    const devops = await prisma.user.upsert({
      where: { email: 'patricia.castro@gestorproyectos.com' },
      update: {},
      create: {
        email: 'patricia.castro@gestorproyectos.com',
        username: 'pcastro',
        name: 'Patricia Castro',
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('✅ Usuario DevOps creado:', devops.email);

    console.log('\n📋 Resumen de usuarios creados:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email                              | Username      | Nombre');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${admin.email.padEnd(33)} | ${admin.username.padEnd(13)} | ${admin.name}`);
    console.log(`${productOwner.email.padEnd(33)} | ${productOwner.username.padEnd(13)} | ${productOwner.name}`);
    console.log(`${scrumMaster.email.padEnd(33)} | ${scrumMaster.username.padEnd(13)} | ${scrumMaster.name}`);
    console.log(`${developer1.email.padEnd(33)} | ${developer1.username.padEnd(13)} | ${developer1.name}`);
    console.log(`${developer2.email.padEnd(33)} | ${developer2.username.padEnd(13)} | ${developer2.name}`);
    console.log(`${tester.email.padEnd(33)} | ${tester.username.padEnd(13)} | ${tester.name}`);
    console.log(`${designer.email.padEnd(33)} | ${designer.username.padEnd(13)} | ${designer.name}`);
    console.log(`${stakeholder.email.padEnd(33)} | ${stakeholder.username.padEnd(13)} | ${stakeholder.name}`);
    console.log(`${seniorDev.email.padEnd(33)} | ${seniorDev.username.padEnd(13)} | ${seniorDev.name}`);
    console.log(`${devops.email.padEnd(33)} | ${devops.username.padEnd(13)} | ${devops.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n🔐 Contraseña por defecto para todos los usuarios: ${defaultPassword}`);
    console.log('⚠️  IMPORTANTE: Cambia las contraseñas después del primer inicio de sesión\n');

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
