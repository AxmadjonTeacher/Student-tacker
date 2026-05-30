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

const words = [
  'test_keys', 'testkeys', 'TestKeys', 'Test_keys',
  'answer_sheets', 'answersheets', 'AnswerSheets', 'Answer_sheets',
  'results', 'Results',
  'scores', 'Scores',
  'test_scores', 'testscores', 'TestScores', 'Test_scores',
  'student_scores', 'studentscores', 'StudentScores', 'Student_scores',
  'student_tests', 'studenttests', 'StudentTests', 'Student_tests',
  'student_test_results', 'studenttestresults', 'StudentTestResults',
  'weekly_tests', 'weeklytests', 'WeeklyTests', 'Weekly_tests',
  'weekly_test_results', 'weeklytestresults', 'WeeklyTestResults',
  'grand_tests', 'grandtests', 'GrandTests', 'Grand_tests',
  'grand_test_results', 'grandtestresults', 'GrandTestResults',
  'evaluations', 'Evaluations',
  'assessments', 'Assessments',
  'quizzes', 'Quizzes', 'quiz', 'Quiz',
  'quiz_results', 'quizresults', 'QuizResults',
  'quiz_answers', 'quizanswers', 'QuizAnswers',
  'quiz_keys', 'quizkeys', 'QuizKeys',
  'answerkeys', 'Answerkeys',
  'omr_results', 'omrresults', 'OMRResults', 'omr_tests',
  'scans', 'Scans', 'paper_scans', 'paperscans', 'PaperScans',
  'scanned_papers', 'scannedpapers', 'ScannedPapers',
  'student_papers', 'studentpapers', 'StudentPapers',
  'test_metadata', 'testmetadata', 'TestMetadata',
  'test_info', 'testinfo', 'TestInfo',
  'test_details', 'testdetails', 'TestDetails',
  'courses', 'Courses', 'course', 'Course',
  'departments', 'Departments', 'department', 'Department',
  'schools', 'Schools', 'school', 'School',
  'news', 'News', 'events', 'Events', 'announcements', 'Announcements',
  'users', 'Users', 'profiles', 'Profiles', 'profile', 'Profile',
  'admins', 'Admins', 'testors', 'Testors', 'testor', 'Testor',
  'roles', 'Roles', 'role', 'Role',
  'weekly_scores', 'weeklyscores', 'WeeklyScores',
  'student_weekly_scores', 'studentweeklyscores', 'StudentWeeklyScores',
  'progress', 'Progress', 'student_progress', 'studentprogress', 'StudentProgress',
  'attendance', 'Attendance', 'homework', 'Homework', 'homeworks', 'Homeworks',
  'activities', 'Activities', 'grades', 'Grades', 'grade', 'Grade',
  'levels', 'Levels', 'level', 'Level',
  'classes', 'Classes', 'class', 'Class',
  'class_groups', 'classgroups', 'ClassGroups',
  'groups', 'Groups', 'group', 'Group',
  'students_tests', 'students_test_results',
  'answer_key_details', 'answer_key_headers', 'answer_key_items',
  'test_headers', 'test_items', 'test_sheets', 'sheets'
];

async function run() {
  console.log(`Probing ${words.length} tables on ${host}...`);
  for (const table of words) {
    const res = await tryGetTable(table);
    if (res.status === 200 || res.status === 206) {
      console.log(`[SUCCESS] Table: "${table}" -> Status: ${res.status}`);
      try {
        const parsed = JSON.parse(res.body);
        console.log(`  Row count: ${Array.isArray(parsed) ? parsed.length : 1}`);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('  Columns:', Object.keys(parsed[0]).join(', '));
          console.log('  Sample row:', JSON.stringify(parsed[0]).substring(0, 500));
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
