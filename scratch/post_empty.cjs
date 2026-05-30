const https = require('https');

const host = 'hervrnzkctfppeoayokx.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnZybnprY3RmcHBlb2F5b2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MzE5MjcsImV4cCI6MjA2MjAwNzkyN30.k5_pQgoxCxxyvlcaz9gFNGVzcnMlz00O_yDPj8bwHYQ';

function tryPostEmpty(tableName) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({});
    const options = {
      hostname: host,
      path: `/rest/v1/${tableName}`,
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          tableName,
          status: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        tableName,
        status: 500,
        body: e.message
      });
    });

    req.write(postData);
    req.end();
  });
}

async function run() {
  const tables = ['teachers', 'questions', 'profiles'];
  for (const table of tables) {
    const res = await tryPostEmpty(table);
    console.log(`Table: ${table} -> Status: ${res.status}`);
    console.log('Response:', res.body);
    console.log('----------------------------------------------------');
  }
}

run();
