const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mvrywaffldfzzjgfctfp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cnl3YWZmbGRmenpqZ2ZjdGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTk5OTcsImV4cCI6MjA5NDUzNTk5N30.BmzKU0SEbGW4oy7Ib8h5Yxs8bXoLc3Hv1g2ckg6zPpU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data: students, error } = await supabase.from('Students').select('id, name, surname');
  if (error) {
    console.error('Error fetching students:', error);
    return;
  }
  
  console.log(`Fetched ${students.length} students. Populating random scores...`);
  
  for (const student of students) {
    // eng_score: 7 to 15 (e.g. 7, 8, 9, 10, 11, 12, 13, 14, 15)
    const engScore = Math.floor(Math.random() * 9) + 7;
    // math_score: 7 to 15
    const mathScore = Math.floor(Math.random() * 9) + 7;
    
    const { error: updateError } = await supabase
      .from('Students')
      .update({ eng_score: engScore, math_score: mathScore })
      .eq('id', student.id);
      
    if (updateError) {
      console.error(`Error updating student ${student.name} ${student.surname} (${student.id}):`, updateError);
    } else {
      console.log(`Updated ${student.name} ${student.surname}: Eng=${engScore}, Math=${mathScore}`);
    }
  }
  console.log('Finished updating all students!');
}

main();
