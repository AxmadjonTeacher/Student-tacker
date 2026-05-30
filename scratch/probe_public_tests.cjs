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

const tables = [
  'public_tests', 'publictests', 'PublicTests', 'Public_tests',
  'active_tests', 'activetests', 'ActiveTests', 'Active_tests',
  'test_list', 'testlist', 'TestList', 'Test_list',
  'exams_list', 'examslist', 'ExamsList', 'Exams_list',
  'test_keys', 'testkeys', 'TestKeys', 'Test_keys',
  'test_papers', 'testpapers', 'TestPapers', 'Test_papers',
  'papers', 'Papers',
  'tests_data', 'testdata', 'TestData', 'Tests_data',
  'tests_metadata', 'testmetadata', 'TestMetadata', 'Tests_metadata',
  'test_profiles', 'testprofiles', 'TestProfiles', 'Test_profiles'
];

async function run() {
  for (const table of tables) {
    const res = await tryGetTable(table);
    if (res.status === 200 || res.status === 206) {
      console.log(`[SUCCESS] Table: "${table}" -> Status: ${res.status}`);
      try {
        const parsed = JSON.parse(res.body);
        console.log(`  Row count: ${parsed.length}`);
        if (parsed.length > 0) {
          console.log('  Columns:', Object.keys(parsed[0]).join(', '));
        }
      } catch (e) {
        console.log('  Body:', res.body.substring(0, 100));
      }
    }
  }
}

run();
