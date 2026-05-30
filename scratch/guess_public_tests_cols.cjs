const https = require('https');

const host = 'hervrnzkctfppeoayokx.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnZybnprY3RmcHBlb2F5b2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MzE5MjcsImV4cCI6MjA2MjAwNzkyN30.k5_pQgoxCxxyvlcaz9gFNGVzcnMlz00O_yDPj8bwHYQ';

function trySelect(tableName, columnName) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      path: `/rest/v1/${tableName}?select=${columnName}`,
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
          columnName,
          status: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        columnName,
        status: 500,
        body: e.message
      });
    });

    req.end();
  });
}

const columnsToTry = [
  'id', 'created_at', 'name', 'title', 'subject', 'class', 'className', 'class_name',
  'grade', 'teacher', 'teacher_id', 'teacher_name', 'answer_key', 'key', 'answers',
  'date', 'date_created', 'students_count', 'papers', 'questions_count', 'number_of_questions',
  'duration', 'form', 'questions', 'status', 'description', 'user_id', 'email', 'role',
  'keys', 'correct_answers', 'correct_keys', 'key_string', 'keys_string', 'answer_string',
  'javob', 'javoblar', 'kalit', 'kalitlar', 'natija', 'natijalar', 'fayl', 'fayl_url', 'pdf_file', 'pdf_url', 'url'
];

async function run() {
  const table = 'public_tests';
  console.log(`Probing columns for table: "${table}"`);
  const existing = [];
  for (const col of columnsToTry) {
    const res = await trySelect(table, col);
    if (res.status === 200) {
      existing.push(col);
    }
  }
  console.log(`Existing columns for "${table}":`, existing);
  console.log('----------------------------------------------------');
}

run();
