const https = require('https');

const host = 'hervrnzkctfppeoayokx.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnZybnprY3RmcHBlb2F5b2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MzE5MjcsImV4cCI6MjA2MjAwNzkyN30.k5_pQgoxCxxyvlcaz9gFNGVzcnMlz00O_yDPj8bwHYQ';

const options = {
  hostname: host,
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`
  }
};

const req = https.request(options, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Body length:', data.length);
    if (res.statusCode === 200) {
      try {
        const swagger = JSON.parse(data);
        console.log('Swagger definition fetched successfully.');
        console.log('API Title:', swagger.info?.title);
        console.log('Paths:', Object.keys(swagger.paths || {}));
      } catch (err) {
        console.log('Body start:', data.substring(0, 1000));
      }
    } else {
      console.log('Body start:', data.substring(0, 1000));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();
