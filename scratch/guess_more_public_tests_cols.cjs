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
  // Class/Grade/Form
  'class_number', 'class_letter', 'sinf_nomi', 'sinf_raqami', 'level', 'level_name',
  'academic_level', 'student_grade', 'grades_list', 'group_name', 'group', 'class_id',
  'grade_id', 'course', 'courses', 'grade_name', 'form_name', 'form',
  // Date/Time
  'date', 'test_date', 'exam_date', 'sana', 'time', 'test_time', 'duration', 'test_duration',
  // Keys/Answers
  'keys_json', 'answer_keys_json', 'answers_json', 'questions_json', 'json_keys', 'keys_data',
  'key_data', 'answers_data', 'answer_data', 'answers_list', 'answer_list', 'answers_array',
  'answers_text', 'keys_text', 'key_text', 'answer_text', 'solution', 'solutions',
  'solution_key', 'solutions_key', 'correct_answers_list', 'correct_answers_array',
  'correct_answers_json', 'options', 'choices', 'answers', 'keys', 'key', 'answer_key',
  // Student counts/Papers
  'student_number', 'students_number', 'count_students', 'count_papers', 'paper_count',
  'scans_count', 'scan_count', 'scanned_count', 'scanned_papers_count', 'results_count',
  'result_count', 'submissions_count', 'submission_count', 'total_students', 'total_papers',
  'total_scans', 'total_results', 'total_submissions', 'participants', 'participants_count',
  'qty', 'quantity', 'students_count', 'student_count', 'papers_count', 'papers'
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
