const https = require('https');

const host = 'hervrnzkctfppeoayokx.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnZybnprY3RmcHBlb2F5b2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MzE5MjcsImV4cCI6MjA2MjAwNzkyN30.k5_pQgoxCxxyvlcaz9gFNGVzcnMlz00O_yDPj8bwHYQ';

const options = {
  hostname: host,
  path: '/rest/v1/?apikey=' + apiKey,
  method: 'GET',
  headers: {
    'apikey': apiKey
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const swagger = JSON.parse(data);
      console.log('Swagger definition fetched successfully.');
      console.log('API Title:', swagger.info?.title);
      console.log('API Version:', swagger.info?.version);
      console.log('Available Tables/Paths:');
      const tables = Object.keys(swagger.paths || {});
      tables.forEach(path => {
        if (path === '/') return;
        const cleanPath = path.substring(1);
        console.log(`- ${cleanPath}`);
        // Let's print properties/columns if definitions are present
        const definition = swagger.definitions?.[cleanPath];
        if (definition && definition.properties) {
          const cols = Object.keys(definition.properties).map(prop => {
            const propInfo = definition.properties[prop];
            return `${prop} (${propInfo.type})`;
          });
          console.log(`  Columns: ${cols.join(', ')}`);
        }
      });
    } catch (e) {
      console.error('Failed to parse Swagger JSON:', e);
      console.log('Response body preview:', data.substring(0, 1000));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();
