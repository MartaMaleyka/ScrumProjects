/**
 * Script interactivo para crear la base de datos
 * Pide las credenciales si no están en el .env
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createDatabase() {
  try {
    let host = process.env.MYSQL_HOST || 'localhost';
    let port = parseInt(process.env.MYSQL_PORT || '3306');
    let user = process.env.MYSQL_USER || 'root';
    let password = process.env.MYSQL_PASSWORD;
    let dbName = process.env.MYSQL_DATABASE || 'gestor_proyectos';

    // Si no hay contraseña en .env, pedirla
    if (!password) {
      console.log('No se encontró contraseña en .env');
      password = await question('Ingresa la contraseña de MySQL: ');
    }

    console.log(`Intentando conectar a MySQL en ${host}:${port} como ${user}...`);

    // Conectar sin especificar base de datos
    const connection = await mysql.createConnection({
      host: host,
      port: port,
      user: user,
      password: password,
    });

    console.log('✅ Conectado a MySQL');

    // Crear base de datos si no existe
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Base de datos '${dbName}' verificada/creada`);

    await connection.end();
    console.log('✅ Conexión cerrada');
    rl.close();
    
    return true;
  } catch (error) {
    console.error('❌ Error creando base de datos:', error.message);
    rl.close();
    throw error;
  }
}

createDatabase()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Proceso falló:', error.message);
    console.log('\n💡 Sugerencias:');
    console.log('1. Verifica que MySQL esté corriendo');
    console.log('2. Verifica las credenciales en el archivo .env');
    console.log('3. Intenta crear la base de datos manualmente:');
    console.log('   CREATE DATABASE gestor_proyectos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    process.exit(1);
  });

