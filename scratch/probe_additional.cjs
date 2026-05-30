const https = require('https');

const host = 'hervrnzkctfppeoayokx.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnZybnprY3RmcHBlb2F5b2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MzE5MjcsImV4cCI6MjA2MjAwNzkyN30.k5_pQgoxCxxyvlcaz9gFNGVzcnMlz00O_yDPj8bwHYQ';

function tryGetTable(tableName) {
  return new Promise((resolve) => {
    const encodedName = encodeURIComponent(tableName);
    const options = {
      hostname: host,
      path: `/rest/v1/${encodedName}?select=*`,
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
  'marks',
  'student_marks',
  'submissions',
  'omr',
  'scan_results',
  'scanned_sheets',
  'templates',
  'sessions',
  'schedules',
  'schedule',
  'lessons',
  'lesson',
  'topics',
  'topic',
  'sections',
  'section',
  'categories',
  'category',
  'attachments',
  'files',
  'documents',
  'assignments',
  'assignment'
];

async function run() {
  console.log('Probing additional tables on', host);
  for (const table of tablesToTry) {
    const res = await tryGetTable(table);
    if (res.status === 200 || res.status === 206) {
      console.log(`[SUCCESS] Table: "${table}" -> Status: ${res.status}`);
    } else if (res.status !== 404) {
      console.log(`[ERROR] Table: "${table}" -> Status: ${res.status}`);
      console.log('  Body:', res.body.substring(0, 200));
    }
  }
}

run();
