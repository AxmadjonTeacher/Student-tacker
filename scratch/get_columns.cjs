const https = require('https');

const host = 'hervrnzkctfppeoayokx.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnZybnprY3RmcHBlb2F5b2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MzE5MjcsImV4cCI6MjA2MjAwNzkyN30.k5_pQgoxCxxyvlcaz9gFNGVzcnMlz00O_yDPj8bwHYQ';

function selectInvalidColumn(tableName) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      path: `/rest/v1/${tableName}?select=invalid_column_name_test`,
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
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

    req.end();
  });
}

async function run() {
  const tables = ['teachers', 'questions', 'profiles'];
  for (const table of tables) {
    const res = await selectInvalidColumn(table);
    console.log(`Table: ${table} -> Status: ${res.status}`);
    console.log('Error Response:', res.body);
    console.log('----------------------------------------------------');
  }
}

run();
