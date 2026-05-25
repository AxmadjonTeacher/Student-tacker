const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mvrywaffldfzzjgfctfp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cnl3YWZmbGRmenpqZ2ZjdGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTk5OTcsImV4cCI6MjA5NDUzNTk5N30.BmzKU0SEbGW4oy7Ib8h5Yxs8bXoLc3Hv1g2ckg6zPpU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data: newsData, error: newsError } = await supabase.from('news').select('*').limit(1);
  console.log('news table query result:', { newsData, newsError });
  
  const { data: eventsData, error: eventsError } = await supabase.from('events').select('*').limit(1);
  console.log('events table query result:', { eventsData, eventsError });

  const { data: studentsData, error: studentsError } = await supabase.from('Students').select('*').limit(1);
  console.log('Students table query result:', { studentsData, studentsError });
}

main();
