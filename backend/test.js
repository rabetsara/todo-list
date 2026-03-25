// Test simple pour vérifier que le backend répond
// Jenkins exécute ce fichier dans le stage "Test"
const http = require('http');

const options = {
  hostname: 'localhost',
  port:     3000,
  path:     '/tasks',
  method:   'GET'
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('TEST OK — /tasks répond correctement');
    process.exit(0);   // succès → Jenkins continue
  } else {
    console.error('TEST ECHOUE — status:', res.statusCode);
    process.exit(1);   // échec → Jenkins s'arrête
  }
});

req.on('error', (e) => {
  console.error('TEST ECHOUE — serveur inaccessible:', e.message);
  process.exit(1);
});

req.end();