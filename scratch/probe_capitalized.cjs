const https = require('https');

const host = 'hervrnzkctfppeoayokx.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnZybnprY3RmcHBlb2F5b2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MzE5MjcsImV4cCI6MjA2MjAwNzkyN30.k5_pQgoxCxxyvlcaz9gFNGVzcnMlz00O_yDPj8bwHYQ';

function tryGetTable(tableName) {
  return new Promise((resolve) => {
    // URL encode table name in case it contains spaces
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
  'Tests',
  'tests',
  'Test',
  'test',
  'Test results',
  'Test_results',
  'TestResults',
  'test_results',
  'test results',
  'Exams',
  'exams',
  'Exam',
  'exam',
  'Answer keys',
  'Answer_keys',
  'AnswerKeys',
  'answer_keys',
  'answer keys',
  'Questions',
  'questions',
  'Papers',
  'papers',
  'Test papers',
  'Test_papers',
  'TestPapers',
  'test_papers',
  'test papers',
  'Subjects',
  'subjects',
  'Subject',
  'subject',
  'Teachers',
  'teachers',
  'Teacher',
  'teacher',
  'Students',
  'students',
  'Student',
  'student',
  'Keys',
  'keys',
  'Test keys',
  'Test_keys',
  'test_keys',
  'test keys',
  'Folders',
  'folders',
  'Folder',
  'folder'
];

async function run() {
  console.log('Probing tables on', host);
  for (const table of tablesToTry) {
    const res = await tryGetTable(table);
    if (res.status === 200 || res.status === 206) {
      console.log(`[SUCCESS] Table: "${table}" -> Status: ${res.status}`);
      try {
        const parsed = JSON.parse(res.body);
        console.log(`  Row count: ${Array.isArray(parsed) ? parsed.length : 1}`);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('  Columns:', Object.keys(parsed[0]).join(', '));
          console.log('  Sample row:', JSON.stringify(parsed[0], null, 2));
        } else {
          console.log('  Empty table (no rows)');
        }
      } catch (err) {
        console.log('  Failed to parse JSON. Body start:', res.body.substring(0, 200));
      }
    } else if (res.status !== 404) {
      console.log(`[ERROR] Table: "${table}" -> Status: ${res.status}`);
      console.log('  Body:', res.body.substring(0, 200));
    }
  }
}

run();
