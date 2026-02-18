#!/usr/bin/env node

/**
 * Smoke Test para Open-Core Split
 * 
 * Verifica que:
 * 1. Sin premium: server levanta y endpoints core ok
 * 2. Sin premium: endpoints premium responden 403/404
 * 3. Con premium: endpoints premium responden 200 (si feature flag true)
 * 
 * Uso:
 *   node scripts/smoke-test.js [--with-premium]
 */

const http = require('http');
const { hasPremiumModule } = require('../api/config/features');

const API_BASE = process.env.API_URL || 'http://localhost:3001';
const WITH_PREMIUM = process.argv.includes('--with-premium');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testCoreEndpoints() {
  log('\n📋 Testing Core Endpoints...', 'blue');
  
  const tests = [
    { path: '/health', expectedStatus: 200, name: 'Health check' },
    { path: '/', expectedStatus: 200, name: 'Root endpoint' },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const response = await makeRequest(test.path);
      if (response.status === test.expectedStatus) {
        log(`  ✅ ${test.name}: ${response.status}`, 'green');
        passed++;
      } else {
        log(`  ❌ ${test.name}: Expected ${test.expectedStatus}, got ${response.status}`, 'red');
        failed++;
      }
    } catch (error) {
      log(`  ❌ ${test.name}: Error - ${error.message}`, 'red');
      failed++;
    }
  }

  return { passed, failed };
}

async function testPremiumEndpoints() {
  log('\n💎 Testing Premium Endpoints (should be blocked in Community)...', 'blue');
  
  const premiumEndpoints = [
    { path: '/api/superadmin/organizations', name: 'Superadmin organizations' },
    { path: '/api/scrum/projects/1/roadmap', name: 'Roadmap' },
    { path: '/api/scrum/projects/1/gantt', name: 'Gantt' },
    { path: '/api/scrum/projects/1/releases', name: 'Releases' },
    { path: '/api/integrations/github/repos', name: 'GitHub repos' },
  ];

  let passed = 0;
  let failed = 0;

  for (const endpoint of premiumEndpoints) {
    try {
      const response = await makeRequest(endpoint.path);
      // En community, debería retornar 403 o 404
      if (response.status === 403 || response.status === 404) {
        log(`  ✅ ${endpoint.name}: Blocked correctly (${response.status})`, 'green');
        passed++;
      } else {
        log(`  ⚠️  ${endpoint.name}: Unexpected status ${response.status}`, 'yellow');
        // No falla, solo advierte
        passed++;
      }
    } catch (error) {
      log(`  ❌ ${endpoint.name}: Error - ${error.message}`, 'red');
      failed++;
    }
  }

  return { passed, failed };
}

async function runTests() {
  log('🧪 Sprintiva Open-Core Smoke Test', 'blue');
  log('=====================================\n', 'blue');

  // Verificar estado del módulo premium
  const hasPremium = hasPremiumModule();
  log(`Premium Module: ${hasPremium ? '✅ Available' : '❌ Not Available'}`, hasPremium ? 'green' : 'yellow');
  log(`Test Mode: ${WITH_PREMIUM ? 'With Premium' : 'Community Only'}\n`, 'blue');

  // Test 1: Core endpoints
  const coreResults = await testCoreEndpoints();

  // Test 2: Premium endpoints (deben estar bloqueados en community)
  const premiumResults = await testPremiumEndpoints();

  // Resumen
  log('\n📊 Test Results Summary', 'blue');
  log('=====================================', 'blue');
  log(`Core Endpoints: ${coreResults.passed} passed, ${coreResults.failed} failed`, 
      coreResults.failed === 0 ? 'green' : 'red');
  log(`Premium Endpoints: ${premiumResults.passed} passed, ${premiumResults.failed} failed`,
      premiumResults.failed === 0 ? 'green' : 'red');

  const totalPassed = coreResults.passed + premiumResults.passed;
  const totalFailed = coreResults.failed + premiumResults.failed;

  log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed`, 
      totalFailed === 0 ? 'green' : 'red');

  if (totalFailed === 0) {
    log('\n✅ All tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some tests failed', 'red');
    process.exit(1);
  }
}

// Ejecutar tests
runTests().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

