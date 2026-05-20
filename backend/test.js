const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1',  // ← IPv4 forcé, pas localhost
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data && { 'Content-Length': Buffer.byteLength(data) })
      }
    };
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body: {} });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Démarrage des tests...\n');
  let passed = 0;
  let failed = 0;

  // Test 1 — Health check
  try {
    const res = await request('GET', '/');
    if (res.status === 200 && res.body.status === 'ok') {
      console.log('✅ Test 1 : Health check OK');
      passed++;
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch (e) {
    console.log(`❌ Test 1 : Health check FAILED - ${e.message}`);
    failed++;
  }

  // Test 2 — GET /todos
  try {
    const res = await request('GET', '/todos');
    if (res.status === 200 && Array.isArray(res.body)) {
      console.log('✅ Test 2 : GET /todos OK');
      passed++;
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch (e) {
    console.log(`❌ Test 2 : GET /todos FAILED - ${e.message}`);
    failed++;
  }

  // Test 3 — POST /todos
  let todoId;
  try {
    const res = await request('POST', '/todos', { title: 'Test todo CI/CD' });
    if (res.status === 201 && res.body.id) {
      todoId = res.body.id;
      console.log(`✅ Test 3 : POST /todos OK (id=${todoId})`);
      passed++;
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch (e) {
    console.log(`❌ Test 3 : POST /todos FAILED - ${e.message}`);
    failed++;
  }

  // Test 4 — PUT /todos/:id
  if (todoId) {
    try {
      const res = await request('PUT', `/todos/${todoId}`, { done: true });
      if (res.status === 200 && res.body.done === true) {
        console.log('✅ Test 4 : PUT /todos/:id OK');
        passed++;
      } else {
        throw new Error(`Status ${res.status}`);
      }
    } catch (e) {
      console.log(`❌ Test 4 : PUT /todos/:id FAILED - ${e.message}`);
      failed++;
    }

    // Test 5 — DELETE /todos/:id
    try {
      const res = await request('DELETE', `/todos/${todoId}`);
      if (res.status === 200) {
        console.log('✅ Test 5 : DELETE /todos/:id OK');
        passed++;
      } else {
        throw new Error(`Status ${res.status}`);
      }
    } catch (e) {
      console.log(`❌ Test 5 : DELETE /todos/:id FAILED - ${e.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Résultats : ${passed} passés, ${failed} échoués`);
  if (failed > 0) process.exit(1);
  console.log('🎉 Tous les tests ont réussi !');
}

runTests().catch(err => {
  console.error('❌ Erreur fatale :', err.message);
  process.exit(1);
});
