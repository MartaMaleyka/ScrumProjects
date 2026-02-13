/**
 * Script para crear la base de datos si no existe
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function createDatabase() {
  try {
    // Conectar sin especificar base de datos
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'lachichi12',
    });

    console.log('✅ Conectado a MySQL');

    const dbName = process.env.MYSQL_DATABASE || 'gestor_proyectos';

    // Crear base de datos si no existe
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Base de datos '${dbName}' verificada/creada`);

    await connection.end();
    console.log('✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error creando base de datos:', error);
    throw error;
  }
}

createDatabase()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Proceso falló:', error);
    process.exit(1);
  });

