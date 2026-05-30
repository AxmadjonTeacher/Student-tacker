const https = require('https');

const host = 'hervrnzkctfppeoayokx.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnZybnprY3RmcHBlb2F5b2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MzE5MjcsImV4cCI6MjA2MjAwNzkyN30.k5_pQgoxCxxyvlcaz9gFNGVzcnMlz00O_yDPj8bwHYQ';

function tryGetTable(tableName) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      path: `/rest/v1/${tableName}?select=*`,
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

const tablesToTry = [
  'tests',
  'test',
  'exams',
  'exam',
  'answer_keys',
  'answer_key',
  'answers',
  'students',
  'teachers',
  'classes',
  'subjects',
  'test_papers',
  'papers'
];

async function run() {
  for (const table of tablesToTry) {
    const res = await tryGetTable(table);
    console.log(`Table: ${table} -> Status: ${res.status}`);
    if (res.status === 200 || res.status === 206) {
      try {
        const parsed = JSON.parse(res.body);
        console.log(`Success! Row count: ${Array.isArray(parsed) ? parsed.length : 1}`);
        console.log('Sample data:', JSON.stringify(parsed).substring(0, 500));
      } catch (err) {
        console.log('Body start:', res.body.substring(0, 200));
      }
    } else {
      if (res.status !== 404) {
        console.log('Error body:', res.body.substring(0, 200));
      }
    }
  }
}

run();
