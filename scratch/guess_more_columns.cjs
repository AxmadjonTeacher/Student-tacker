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
  'keys', 'key', 'answers', 'answers_key', 'answer_keys', 'answer_key',
  'test_name', 'test_id', 'test_title', 'title', 'name',
  'teacher_id', 'teacher_name', 'teacher',
  'students_count', 'student_count', 'students', 'student',
  'number_of_students', 'papers_count', 'papers',
  'questions_count', 'number_of_questions', 'questions_num', 'questions',
  'date', 'test_date', 'exam_date', 'date_created', 'sana',
  'duration', 'test_duration', 'vaqt',
  'grade', 'class', 'class_name', 'form', 'grade_id', 'grade_name', 'grade_level', 'class_id', 'sinf',
  'pdf', 'pdf_url', 'pdf_file', 'file', 'file_url', 'hujjat', 'hujjat_url', 'url',
  'active', 'status', 'description',
  'correct_answers', 'correct_keys', 'key_string', 'keys_string', 'answer_string', 'javob', 'javoblar', 'kalit', 'kalitlar',
  'teacher_subject', 'fan', 'o\'qituvchi', 'o\'qituvchi_ismi', 'o\'qituvchi_id'
];

async function run() {
  const tables = ['questions', 'teachers'];
  for (const table of tables) {
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
}

run();
